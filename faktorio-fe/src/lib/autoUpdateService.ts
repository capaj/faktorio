import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect } from 'react'

export function useAutoUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
    onNeedRefresh() {
      console.log('New version available, updating automatically...')
      // Automatically update without user interaction
      updateServiceWorker(true)

      // For browsers that don't properly handle the automatic update,
      // force a reload after a short delay
      setTimeout(() => {
        console.log('Forcing page reload to ensure update is applied...')
        window.location.reload()
      }, 2000)
    },
    onOfflineReady() {
      console.log('App ready to work offline')
    }
  })

  // Check for updates when the page becomes visible and periodically
  useEffect(() => {
    const checkForUpdates = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update()
          }
        })
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates()
      }
    }

    const updateInterval = setInterval(
      () => {
        console.log('Periodic update check...')
        checkForUpdates()
      },
      15 * 60 * 1000 // 15 minutes
    )

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(updateInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { needRefresh }
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
