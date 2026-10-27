export function parseContactWebsite(website: string): URL | null {
  const value = website.trim()
  if (!value) return null

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`
    )
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null
    }
    return url
  } catch {
    return null
  }
}

export function getContactFaviconUrl(website?: string | null): string | null {
  const url = website ? parseContactWebsite(website) : null
  if (!url) return null

  // Send only the hostname; contact website paths and query strings stay private.
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=32`
}
