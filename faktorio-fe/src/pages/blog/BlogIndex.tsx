import { useEffect, useState } from 'react'
import { Link } from 'wouter'

interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
}

interface BlogIndexProps {
  initialPosts?: BlogPost[]
}

export function BlogIndex({ initialPosts }: BlogIndexProps) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts || [])
  const isSSR = typeof window === 'undefined'

  useEffect(() => {
    if (!initialPosts) {
      fetch('/blog-content/index.json')
        .then((res) => res.json())
        .then((data) => setPosts(data))
    }
  }, [initialPosts])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-12">Blog</h1>
      <div className="space-y-12">
        {posts.map((post) => (
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
                Read more →
              </a>
            ) : (
              <Link
                href={`/blog/${post.slug}`}
                className="text-blue-600 hover:underline inline-block text-lg"
              >
                Read more →
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
