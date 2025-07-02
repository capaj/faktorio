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
    icon: data.icon || '/faktura.png',
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
