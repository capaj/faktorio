import { clientsClaim } from 'workbox-core'
import {
  addPlugins,
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute
} from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'

function isValidAsset(request, response) {
  const pathname = new URL(request.url).pathname
  const contentType = response.headers.get('Content-Type') || ''
  if (/\.m?js$/.test(pathname))
    return /javascript|ecmascript/i.test(contentType)
  if (pathname.endsWith('.css')) return /^text\/css\b/i.test(contentType)
  if (pathname.endsWith('.wasm'))
    return /^application\/wasm\b/i.test(contentType)
  return true
}

// Pages returns HTML with status 200 for missing assets. Never cache that as
// JavaScript/CSS, and repair entries left behind by an earlier deployment.
addPlugins([
  {
    cacheWillUpdate: async ({ request, response }) =>
      response.status === 200 && isValidAsset(request, response)
        ? response
        : null,
    cachedResponseWillBeUsed: async ({ request, cachedResponse }) =>
      cachedResponse && isValidAsset(request, cachedResponse)
        ? cachedResponse
        : undefined
  }
])

// Online navigations must use the deployed HTML instead of an older cached
// shell. Keep the matching precached shell available for offline use.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ request }) => {
    try {
      const response = await fetch(request)
      if (response.ok) return response
    } catch {}
    return (await matchPrecache('index.html')) || Response.error()
  }
)

// Precache and route using the manifest
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Enable automatic updates - skip waiting and claim clients immediately
self.skipWaiting()
clientsClaim()

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Faktorio', body: event.data.text() }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/faktura.png',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || data.data?.type || 'default',
    renotify: true,
    vibrate: [200, 100, 200]
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Faktorio', options)
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const targetUrl = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })

      const existing =
        clientList.find((client) => client.url === targetUrl) ||
        clientList.find(
          (client) => new URL(client.url).origin === self.location.origin
        )

      if (existing) {
        if (existing.url !== targetUrl && 'navigate' in existing) {
          await existing.navigate(targetUrl).catch(() => {})
        }
        return existing.focus()
      }

      return clients.openWindow(targetUrl)
    })()
  )
})
