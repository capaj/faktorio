import { useEffect } from 'react'

export function useAutoUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      return
    }

    const handleServiceWorkerUpdate = () => {
      console.log('New version available, updating automatically...')
      // Force a reload to use the new service worker
      window.location.reload()
    }

    const checkForUpdates = () => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update()
        }
      })
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates()
      }
    }

    // Check for updates every 15 minutes
    const updateInterval = setInterval(
      () => {
        console.log('Periodic update check...')
        checkForUpdates()
      },
      15 * 60 * 1000
    )

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Wait for service worker to be ready and set up update detection
    navigator.serviceWorker.ready.then((registration) => {
      console.log('Service Worker ready')

      // Check for updates when the service worker is ready
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          console.log('New service worker installing...')
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('New service worker installed, reloading page...')
              handleServiceWorkerUpdate()
            }
          })
        }
      })
    })

    return () => {
      clearInterval(updateInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {}
}

// Alternative approach using direct service worker registration
export function initializeAutoUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully')

        // Check for updates periodically
        const checkForUpdates = () => {
          registration
            .update()
            .then(() => {
              console.log('Checked for service worker updates')
            })
            .catch((error) => {
              console.error('Error checking for updates:', error)
            })
        }

        // Check for updates every 30 seconds
        setInterval(checkForUpdates, 30000)

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            console.log('New service worker installing...')
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.log('New service worker installed, reloading page...')
                // Reload the page to use the new service worker
                window.location.reload()
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  }
}
