import { useEffect, useState } from 'react'
import { useRoute } from 'wouter'

interface BlogPost {
  title: string
  content: string
  date: string
}

interface BlogPostProps {
  initialPost?: BlogPost
  slug?: string
}

export function BlogPost({ initialPost, slug }: BlogPostProps) {
  const [, params] =
    typeof window === 'undefined' ? [null, { slug }] : useRoute('/blog/:slug')
  const [post, setPost] = useState<BlogPost | null>(initialPost || null)

  useEffect(() => {
    if (!initialPost && params?.slug) {
      fetch(`/blog-content/${params.slug}.json`)
        .then((res) => res.json())
        .then((data) => setPost(data))
    }
  }, [params?.slug, initialPost])

  if (!post) {
    return <div>Loading...</div>
  }

  return (
    <article className="prose lg:prose-xl mx-auto prose-p:mb-6 prose-headings:mt-8 prose-headings:mb-4">
      <h2 className="mb-2">{post.title}</h2>
      <time dateTime={post.date} className="text-gray-500 block mb-8">
        {new Date(post.date).toLocaleDateString()}
      </time>
      <div
        dangerouslySetInnerHTML={{ __html: post.content }}
        className="[&>p]:mb-6 [&>ul]:mb-6 [&>ul]:mt-2 [&>ul>li]:mb-2"
      />
    </article>
  )
}
