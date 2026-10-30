import { useState } from 'react'
import { getContactFaviconUrl } from '@/lib/contactWebsite'

export function ContactFavicon({ website }: { website?: string | null }) {
  const src = getContactFaviconUrl(website)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) return null

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={20}
      height={20}
      className="h-5 w-5 shrink-0 rounded-sm object-contain"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  )
}
