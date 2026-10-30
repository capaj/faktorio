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
  console.log('Push event received:', event)

  if (!event.data) {
    console.log('No data in push event')
    return
  }

  let data
  try {
    data = event.data.json()
  } catch (error) {
    console.error('Error parsing push data:', error)
    return
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/faktura.png',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.data?.type || 'default',
    requireInteraction: true,
    vibrate: [200, 100, 200]
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', function (event) {
  console.log('Notification clicked:', event)

  event.notification.close()

  const data = event.notification.data
  let url = '/'

  if (data && data.url) {
    url = data.url
  }

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          // Check if there's already a window/tab open with the target URL
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i]
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus()
            }
          }

          // If no existing window/tab, open a new one
          if (clients.openWindow) {
            return clients.openWindow(url)
          }
        })
    )
  }
})

self.addEventListener('notificationclose', function (event) {
  console.log('Notification closed:', event)
})
