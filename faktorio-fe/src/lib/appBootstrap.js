// This runs before the hashed application bundles, including when they fail to load.
;(() => {
  const serviceWorker = navigator.serviceWorker
  const recoveryKey = 'faktorio:asset-recovery'
  let controller = serviceWorker?.controller
  let reloading = false
  let assetFailed = false

  const reload = () => {
    if (!reloading) {
      reloading = true
      window.location.reload()
    }
  }

  serviceWorker?.addEventListener('controllerchange', () => {
    const previousController = controller
    controller = serviceWorker.controller
    // An installed worker may still be waiting for activation. Reload only
    // after the new worker controls this page and can serve its matching assets.
    if (previousController || assetFailed) reload()
  })

  const registration = serviceWorker
    ?.register('/sw.js', { updateViaCache: 'none' })
    .catch((error) => {
      console.error('Service Worker registration failed:', error)
    })

  const checkForUpdates = () =>
    registration
      ?.then((value) => value?.update())
      .catch((error) => {
        console.error('Error checking for service worker updates:', error)
      })

  const recoverFromAssetError = () => {
    assetFailed = true
    // A permanently missing asset must not cause an endless reload loop.
    try {
      if (sessionStorage.getItem(recoveryKey)) return false
      sessionStorage.setItem(recoveryKey, '1')
    } catch {
      return false
    }

    Promise.resolve(checkForUpdates()).finally(reload)
    return true
  }

  window.addEventListener(
    'error',
    (event) => {
      const element = event.target
      const resource =
        element instanceof HTMLScriptElement && element.type === 'module'
          ? element.src
          : element instanceof HTMLLinkElement &&
              ['stylesheet', 'modulepreload'].includes(element.rel)
            ? element.href
            : null

      if (resource) {
        const url = new URL(resource, window.location.href)
        if (
          url.origin === window.location.origin &&
          url.pathname.startsWith('/assets/')
        ) {
          recoverFromAssetError()
        }
      }
    },
    true
  )

  window.addEventListener('vite:preloadError', (event) => {
    if (recoverFromAssetError()) event.preventDefault()
  })

  window.addEventListener('faktorio:app-ready', () => {
    if (assetFailed) return
    try {
      sessionStorage.removeItem(recoveryKey)
    } catch {}
  })

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForUpdates()
  })
  setInterval(checkForUpdates, 15 * 60 * 1000)
})()
