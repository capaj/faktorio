import { useState } from 'react'
import { Link } from 'wouter'

interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
}

interface BlogIndexProps {
  posts: BlogPost[]
}

export function BlogIndex({ posts }: BlogIndexProps) {
  const [sortAscending, setSortAscending] = useState(true)
  const isSSR = typeof window === 'undefined'

  const sortedPosts = [...posts].sort((a, b) => {
    const order = sortAscending ? 1 : -1
    return order * (new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  // A sort switch, not tabs: two toggle buttons styled like the tab list
  const sortOptions = [
    { label: 'Od nejstaršího', ascending: false },
    { label: 'Od nejnovějšího', ascending: true }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold">Blog</h1>
        <div
          role="group"
          aria-label="Řazení článků"
          className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
        >
          {sortOptions.map(({ label, ascending }) => (
            <button
              key={label}
              type="button"
              aria-pressed={sortAscending === ascending}
              onClick={() => setSortAscending(ascending)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-12">
        {sortedPosts.map((post) => (
          <article key={post.slug} className="border-b pb-12">
            <h2 className="text-3xl font-semibold mb-3">
              {isSSR ? (
                <a href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </a>
              ) : (
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              )}
            </h2>
            <time className="text-fg-muted mb-6 block">
              {new Date(post.date).toLocaleDateString()}
            </time>
            <p className="text-fg-secondary text-lg leading-relaxed mb-6">
              {post.excerpt}
            </p>
            {isSSR ? (
              <a
                href={`/blog/${post.slug}`}
                className="text-info hover:underline inline-block text-lg"
              >
                Celý článek →
              </a>
            ) : (
              <Link
                href={`/blog/${post.slug}`}
                className="text-info hover:underline inline-block text-lg"
              >
                Celý článek →
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
