import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState, useCallback } from 'react'
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

  const handleSortChange = (value: string) => {
    setSortAscending(value === 'newest')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-bold">Blog</h1>
        <Tabs defaultValue="newest" onValueChange={handleSortChange}>
          <TabsList>
            <TabsTrigger value="oldest">Od nejstaršího</TabsTrigger>
            <TabsTrigger value="newest">Od nejnovějšího</TabsTrigger>
          </TabsList>
        </Tabs>
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
            <time className="text-gray-500 mb-6 block">
              {new Date(post.date).toLocaleDateString()}
            </time>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              {post.excerpt}
            </p>
            {isSSR ? (
              <a
                href={`/blog/${post.slug}`}
                className="text-blue-600 hover:underline inline-block text-lg"
              >
                Celý článek →
              </a>
            ) : (
              <Link
                href={`/blog/${post.slug}`}
                className="text-blue-600 hover:underline inline-block text-lg"
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
