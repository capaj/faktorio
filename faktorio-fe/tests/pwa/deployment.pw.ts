import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const frontend = fileURLToPath(new URL('../../', import.meta.url))
const bootstrap = await readFile(
  new URL('../../src/lib/appBootstrap.js', import.meta.url),
  'utf8'
)
const deployments = new Map<string, Map<string, string>>()
let server: Server
let origin: string
let version: string
let staleResponses: number
let brokenAsset: 'script' | 'style' | 'late style' | undefined
let missingAssets: string[]

function html(release: string) {
  return `<!doctype html><html><head>
    <script>${bootstrap}</script>
    <script>sessionStorage.setItem('page-loads', Number(sessionStorage.getItem('page-loads') || 0) + 1)</script>
    <link rel="stylesheet" href="/assets/app-${release}.css">
    <script type="module" src="/assets/app-${release}.js"></script>
    </head><body><main></main></body></html>`
}

test.beforeAll(async () => {
  for (const release of ['v1', 'v2']) {
    const result = await build({
      configFile: false,
      root: frontend,
      publicDir: false,
      logLevel: 'silent',
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'self.__WB_MANIFEST': JSON.stringify([
          { url: 'index.html', revision: release },
          { url: `assets/app-${release}.js`, revision: null },
          { url: `assets/app-${release}.css`, revision: null }
        ])
      },
      build: {
        write: false,
        lib: {
          entry: `${frontend}public/sw.js`,
          formats: ['iife'],
          name: 'FaktorioServiceWorker'
        }
      }
    })
    const output = Array.isArray(result) ? result[0].output : result.output
    const worker = output.find((file) => file.type === 'chunk')
    if (!worker || worker.type !== 'chunk') throw new Error('No service worker')

    deployments.set(
      release,
      new Map([
        ['/index.html', html(release)],
        ['/probe.html', '<!doctype html><title>Cache setup</title>'],
        ['/sw.js', worker.code],
        [
          `/assets/app-${release}.js`,
          `document.querySelector('main').textContent = '${release}'`
        ],
        [`/assets/app-${release}.css`, 'main { color: rgb(0, 128, 0) }']
      ])
    )
  }

  server = createServer((request, response) => {
    const url = new URL(request.url!, origin)
    let resource = url.pathname
    if (resource === '/') {
      if (staleResponses > 0) {
        staleResponses--
        response.setHeader('Content-Type', 'text/html')
        response.end(html('v1'))
        return
      }
      resource = '/index.html'
    }

    const absent =
      (brokenAsset === 'script' &&
        resource.endsWith('.js') &&
        resource !== '/sw.js') ||
      (brokenAsset === 'style' && resource.endsWith('.css'))
    let body = absent ? undefined : deployments.get(version)!.get(resource)
    if (
      brokenAsset === 'late style' &&
      resource.startsWith('/assets/') &&
      resource.endsWith('.js')
    ) {
      body += `;setTimeout(() => {
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = '/assets/missing.css';
        document.head.append(style);
      }, 50)`
    }
    let type = resource.endsWith('.js')
      ? 'application/javascript'
      : resource.endsWith('.css')
        ? 'text/css'
        : 'text/html'

    // Match Cloudflare Pages: missing files receive the SPA HTML with status 200.
    if (body === undefined) {
      if (resource.startsWith('/assets/')) missingAssets.push(resource)
      body = html(version)
      type = 'text/html'
    }
    response.setHeader('Content-Type', type)
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Cache-Control', 'no-store')
    response.end(body)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No test server')
  origin = `http://127.0.0.1:${address.port}`
})

test.beforeEach(() => {
  version = 'v1'
  staleResponses = 0
  brokenAsset = undefined
  missingAssets = []
})

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
    server.closeAllConnections()
  })
})

test('updates to matching assets after activation and preserves local data', async ({
  page,
  context
}) => {
  await page.goto(origin)
  await expect(page.locator('main')).toHaveText('v1')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true)
  expect(await page.evaluate(() => sessionStorage.getItem('page-loads'))).toBe(
    '1'
  )

  await page.evaluate(async () => {
    localStorage.setItem('invoice-draft', 'keep me')
    const cache = await caches.open('invoice-attachments')
    await cache.put('/saved-invoice', new Response('keep this too'))
  })
  version = 'v2'
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration!.update()
  })

  await expect(page.locator('main')).toHaveText('v2')
  await expect(page.locator('main')).toHaveCSS('color', 'rgb(0, 128, 0)')
  expect(await page.evaluate(() => sessionStorage.getItem('page-loads'))).toBe(
    '2'
  )
  expect(missingAssets).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('invoice-draft'))).toBe(
    'keep me'
  )
  expect(
    await page.evaluate(async () =>
      (await caches.match('/saved-invoice'))?.text()
    )
  ).toBe('keep this too')

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('main')).toHaveText('v2')
})

test('recovers from stale HTML even when the application module cannot run', async ({
  page
}) => {
  version = 'v2'
  staleResponses = 1
  await page.goto(origin)
  await expect(page.locator('main')).toHaveText('v2')
  expect(missingAssets).toContain('/assets/app-v1.js')
  expect(
    await page.evaluate(() => sessionStorage.getItem('faktorio:asset-recovery'))
  ).toBe(`${origin}/assets/app-v1.js`)
})

test('uses the deployed HTML when navigating with an older worker', async ({
  page
}) => {
  await page.goto(origin)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  version = 'v2'
  await page.reload()
  await expect(page.locator('main')).toHaveText('v2')
})

test('repairs HTML cached under a JavaScript asset URL', async ({ page }) => {
  await page.goto(`${origin}/probe.html`)
  await page.evaluate(async () => {
    const cache = await caches.open(`workbox-precache-v2-${location.origin}/`)
    await cache.put(
      '/assets/app-v1.js',
      new Response('<!doctype html>', {
        headers: { 'Content-Type': 'text/html' }
      })
    )
  })
  await page.goto(origin)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  expect(
    await page.evaluate(async () =>
      (await caches.match('/assets/app-v1.js'))?.headers.get('Content-Type')
    )
  ).toBe('application/javascript')
  await page.reload()
  await expect(page.locator('main')).toHaveText('v1')
})

for (const asset of ['script', 'style', 'late style'] as const) {
  test(`does not loop when a ${asset} is permanently unavailable`, async ({
    page
  }) => {
    let navigations = 0
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations++
    })
    brokenAsset = asset
    await page.goto(origin)
    await expect.poll(() => navigations).toBeGreaterThanOrEqual(2)
    await page.waitForTimeout(1000)
    // Initial activation can coincide with the single asset recovery reload.
    // Observe navigations outside the page: reloads destroy its JS context.
    expect(navigations).toBeLessThanOrEqual(3)
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem('faktorio:asset-recovery')
      )
    ).toBe(`${origin}/assets/app-v1.js`)
  })
}

test('recovers from a failed dynamic import', async ({ page }) => {
  await page.goto(origin)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true)
  const navigation = page.waitForEvent('framenavigated')
  await page.evaluate(() => {
    window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
  })
  await navigation
  await expect(page.locator('main')).toHaveText('v1')
  expect(await page.evaluate(() => sessionStorage.getItem('page-loads'))).toBe(
    '2'
  )
})
