import { defineConfig, Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'
import matter from 'gray-matter'
import { marked } from 'marked'
// @ts-ignore
import { getGitHash } from '../src/getGitHash'

const gitHash = getGitHash()

interface BlogPost {
  slug: string
  title: string
  date: string
  content: string
  excerpt: string
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

      const htmlContent = marked.parse(content) as string
      const firstParagraph =
        content.split('\n').find((line) => line.trim().length > 0) || ''
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
  plugins: [react(), tailwindcss(), blogPlugin()],
  server: {
    cors: true,
    host: true,
    fs: {
      // Allow serving files from one level up from the package root
      allow: ['..']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return `vendor_${gitHash}`
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
