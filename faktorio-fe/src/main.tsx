import React, { startTransition } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'

import type { Database } from 'sql.js'

let reactRoot: ReactDOM.Root

declare global {
  interface Window {
    sqldb: Database
  }
}

export const reactMainRender = async () => {
  const reactRootDiv = document.getElementById('root')

  if (reactRoot) {
    reactRoot.unmount()
  }

  if (!reactRootDiv) {
    throw new Error('Root element not found')
  }

  // The landing page is prerendered into #root at build time (see vite.config.ts). Hydrate it
  // instead of re-creating the DOM, as a transition so React hydrates in small slices and
  // does not block the main thread. Re-renders and other pages use a fresh client root.
  if (!reactRoot && reactRootDiv.childElementCount > 0) {
    startTransition(() => {
      reactRoot = ReactDOM.hydrateRoot(reactRootDiv, <App />)
    })
    return
  }

  reactRoot = ReactDOM.createRoot(reactRootDiv)
  reactRoot.render(<App />)
}

reactMainRender()
