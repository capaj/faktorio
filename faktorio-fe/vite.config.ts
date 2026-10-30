import { createServer, defineConfig, Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'
import matter from 'gray-matter'
import { marked } from 'marked'

interface BlogPost {
  slug: string
  title: string
  date: string
  content: string
  excerpt: string
}

const IMAGES_DIR = path.join(process.cwd(), 'public/images')

// Reads width and height from a PNG header (bytes 16-23 of the IHDR chunk)
function pngSize(file: string) {
  const header = Buffer.alloc(24)
  const fd = fs.openSync(file, 'r')
  fs.readSync(fd, header, 0, 24, 0)
  fs.closeSync(fd)
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) }
}

// Blog images: serve the WebP in public/images/blog when there is one, and add
// width/height (no layout shift) and lazy loading
function enhanceBlogImages(html: string) {
  return html.replace(
    /<img src="(?:\.\.\/)*images\/([^"]+)\.png" alt="([^"]*)">/g,
    (tag, name: string, alt: string) => {
      const png = path.join(IMAGES_DIR, `${name}.png`)
      if (!fs.existsSync(png)) return tag
      const { width, height } = pngSize(png)
      const webp = path.join(IMAGES_DIR, 'blog', `${name}.webp`)
      const src = fs.existsSync(webp)
        ? `/images/blog/${name}.webp`
        : `/images/${name}.png`
      return `<img src="${src}" alt="${alt}" width="${width}" height="${height}" loading="lazy" decoding="async">`
    }
  )
}

// Renders the signed-out landing page into index.html, so the first paint does not wait
// for the JavaScript bundle (FCP/LCP) and crawlers get real content. index.html is also the
// SPA fallback for every other route; an inline script in index.html drops the markup there.
function prerenderLandingPage(): Plugin {
  return {
    name: 'prerender-landing-page',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      const page = bundle['index.html']
      if (!page || page.type !== 'asset') return

      const server = await createServer({
        configFile: false,
        root: __dirname,
        mode: 'production',
        logLevel: 'error',
        resolve: { alias: { '@': path.resolve(__dirname, './src') } },
        server: { middlewareMode: true, hmr: false, ws: false },
        appType: 'custom'
      })
      try {
        const { render } = await server.ssrLoadModule(
          '/src/entry-prerender.tsx'
        )
        const html = String(page.source)
        if (!html.includes('<div id="root"></div>')) {
          throw new Error(
            'prerender: <div id="root"></div> not found in index.html'
          )
        }
        const preloads = [
          ...html.matchAll(
            /<link rel="modulepreload" crossorigin href="([^"]+)">/g
          )
        ].map((match) => match[1])

        page.source = html
          .replace(
            '<div id="root"></div>',
            `<div id="root">${render('/')}</div>`
          )
          // Load the app only after the prerendered page has painted its main content (LCP),
          // so the bundle never competes with it; links and content work without it. Without
          // prerendered content (other routes, signed-in visitors) it loads immediately. The
          // modulepreload links move into the loader so they follow the same timing.
          .replace(
            /\s*<link rel="modulepreload" crossorigin href="[^"]+">/g,
            ''
          )
          .replace(
            /<script type="module" crossorigin src="(\/assets\/[^"]+\.js)"><\/script>/,
            (_tag, src: string) => `<script type="module">
      const preloads = ${JSON.stringify(preloads)}
      const start = () => {
        for (const href of preloads) {
          const link = document.createElement('link')
          link.rel = 'modulepreload'
          link.crossOrigin = ''
          link.href = href
          document.head.append(link)
        }
        import('${src}')
      }
      if (document.getElementById('root').childElementCount && 'PerformanceObserver' in window) {
        let started = false
        const once = () => started || ((started = true), start())
        new PerformanceObserver(once).observe({ type: 'largest-contentful-paint', buffered: true })
        setTimeout(once, 3000)
      } else {
        start()
      }
    </script>`
          )
          // Inline the stylesheet: one render-blocking request less before the first paint
          .replace(
            /<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"[^>]*>/,
            (tag, file: string) => {
              const css = bundle[file]
              return css?.type === 'asset'
                ? `<style>${css.source}</style>`
                : tag
            }
          )
      } finally {
        await server.close()
      }
    }
  }
}

function blogPlugin(): Plugin {
  const BLOG_DIR = path.join(process.cwd(), 'content/blog')

  const processBlogPosts = (): BlogPost[] => {
    const posts: BlogPost[] = []

    if (!fs.existsSync(BLOG_DIR)) {
      return posts
    }

    const files = fs.readdirSync(BLOG_DIR)

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      const filePath = path.join(BLOG_DIR, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data, content } = matter(fileContent)
      const slug = file.replace('.md', '')

      const htmlContent = enhanceBlogImages(marked.parse(content) as string)
      const firstParagraph =
        content
          .split('\n')
          .map((line) => line.trim())
          .find(
            (line) =>
              line.length > 0 && !line.startsWith('![') && !line.startsWith('#')
          ) || ''
      const excerpt =
        firstParagraph.slice(0, 150) +
        (firstParagraph.length > 150 ? '...' : '')

      posts.push({
        slug,
        title: data.title,
        date: data.date,
        content: htmlContent,
        excerpt
      })
    }

    return posts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  return {
    name: 'blog-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const blogContentPath = '/blog-content/'
        if (req.url?.startsWith(blogContentPath)) {
          const slug = req.url
            .slice(blogContentPath.length)
            .replace('.json', '')

          if (slug === 'index') {
            const posts = processBlogPosts()
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify(
                posts.map(({ slug, title, date, excerpt }) => ({
                  slug,
                  title,
                  date,
                  excerpt
                }))
              )
            )
            return
          }

          const posts = processBlogPosts()
          const post = posts.find((p) => p.slug === slug)

          if (post) {
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                title: post.title,
                date: post.date,
                content: post.content
              })
            )
          } else {
            res.statusCode = 404
            res.end('Not found')
          }
          return
        }
        next()
      })
    },
    generateBundle() {
      const posts = processBlogPosts()
      const BLOG_CONTENT_OUTPUT_DIR = path.join(
        process.cwd(),
        'dist/blog-content'
      )
      const BLOG_OUTPUT_DIR = path.join(process.cwd(), 'dist/public/blog')

      // Create output directories
      ;[BLOG_CONTENT_OUTPUT_DIR, BLOG_OUTPUT_DIR].forEach((dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      })

      // Generate index.json
      fs.writeFileSync(
        path.join(BLOG_CONTENT_OUTPUT_DIR, 'index.json'),
        JSON.stringify(
          posts.map(({ slug, title, date, excerpt }) => ({
            slug,
            title,
            date,
            excerpt
          }))
        )
      )

      // Generate individual post JSON files
      for (const post of posts) {
        fs.writeFileSync(
          path.join(BLOG_CONTENT_OUTPUT_DIR, `${post.slug}.json`),
          JSON.stringify({
            title: post.title,
            date: post.date,
            content: post.content
          })
        )
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      srcDir: 'public',
      filename: 'sw.js',
      strategies: 'injectManifest',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 3000000
      },
      manifest: {
        name: 'Faktorio',
        short_name: 'Faktorio',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        // Generated by scripts/generate-social-images.mts
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    }),
    {
      name: 'app-bootstrap',
      apply: 'build',
      transformIndexHtml: {
        order: 'pre',
        // Right after <meta charset>: the charset must come first in <head>, and the
        // bootstrap still runs before any application bundle
        handler: (html) =>
          html.replace(
            '<meta charset="UTF-8" />',
            `<meta charset="UTF-8" />\n    <script id="faktorio-app-bootstrap">${fs.readFileSync(
              path.resolve(__dirname, 'src/lib/appBootstrap.js'),
              'utf8'
            )}</script>`
          )
      }
    },
    react(),
    tailwindcss(),
    blogPlugin(),
    prerenderLandingPage()
  ],
  server: {
    cors: true,
    host: true,
    fs: {
      // Allow serving files from one level up from the package root
      allow: ['..']
    }
  },
  assetsInclude: ['**/*.sql'],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info.at(-1)
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
        chunkFileNames: `assets/[name]-[hash].js`,
        entryFileNames: `assets/[name]-[hash].js`
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
