import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { initSqlDb } from './lib/initSql.ts'
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

  const sqldb = await initSqlDb()

  window.sqldb = sqldb
  reactRoot = ReactDOM.createRoot(reactRootDiv)
  reactRoot.render(<App />)
}

reactMainRender()
