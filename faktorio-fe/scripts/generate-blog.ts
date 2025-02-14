import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import ReactDOMServer from 'react-dom/server'
import { BlogPost as BlogPostComponent } from '../src/pages/blog/BlogPost'
import { BlogIndex as BlogIndexComponent } from '../src/pages/blog/BlogIndex'
import React from 'react'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const OUTPUT_DIR = path.join(process.cwd(), 'public/blog')
const JSON_OUTPUT_DIR = path.join(process.cwd(), 'public/blog-content')

interface BlogPost {
  slug: string
  title: string
  date: string
  content: string
  excerpt: string
}

const htmlTemplate = (
  content: string,
  title: string,
  description: string
) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="stylesheet" href="/src/globals.css">
</head>
<body>
    <div id="root">${content}</div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`

async function generateBlog() {
  // Create output directories
  ;[OUTPUT_DIR, JSON_OUTPUT_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })

  const posts: BlogPost[] = []
  const files = fs.readdirSync(BLOG_DIR)

  for (const file of files) {
    if (!file.endsWith('.md')) continue

    const filePath = path.join(BLOG_DIR, file)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(fileContent)
    const slug = file.replace('.md', '')

    const htmlContent = await marked(content)
    const excerpt = content.split('\n')[0].slice(0, 150) + '...'

    const post: BlogPost = {
      slug,
      title: data.title,
      date: data.date,
      content: htmlContent,
      excerpt
    }

    posts.push(post)

    // Generate static HTML file using BlogPost component
    const blogPostHtml = ReactDOMServer.renderToString(
      React.createElement(BlogPostComponent, {
        initialPost: {
          title: post.title,
          date: post.date,
          content: htmlContent
        },
        slug
      })
    )

    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${slug}.html`),
      htmlTemplate(blogPostHtml, `${post.title} - Faktorio Blog`, post.excerpt)
    )

    // Generate JSON file (for client-side hydration)
    fs.writeFileSync(
      path.join(JSON_OUTPUT_DIR, `${slug}.json`),
      JSON.stringify({
        title: post.title,
        date: post.date,
        content: htmlContent
      })
    )
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Generate index HTML file using BlogIndex component
  const blogIndexHtml = ReactDOMServer.renderToString(
    React.createElement(BlogIndexComponent, { initialPosts: posts })
  )

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'index.html'),
    htmlTemplate(
      blogIndexHtml,
      'Faktorio Blog',
      'Latest news and updates from Faktorio - the modern invoicing platform'
    )
  )

  // Generate index JSON file (for client-side hydration)
  fs.writeFileSync(
    path.join(JSON_OUTPUT_DIR, 'index.json'),
    JSON.stringify(
      posts.map(({ slug, title, date, excerpt }) => ({
        slug,
        title,
        date,
        excerpt
      }))
    )
  )

  console.log(`Generated ${posts.length} blog posts`)
}

generateBlog()
