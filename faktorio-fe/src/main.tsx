import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'

import { Database } from 'sql.js'

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

  reactRoot = ReactDOM.createRoot(reactRootDiv)
  reactRoot.render(<App />)
}

reactMainRender()
