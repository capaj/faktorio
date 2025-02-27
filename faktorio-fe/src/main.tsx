import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'

let reactRoot: ReactDOM.Root

export const reactMainRender = () => {
  const reactRootDiv = document.getElementById('root')!

  if (reactRoot) {
    reactRoot.unmount()
  }

  reactRoot = ReactDOM.createRoot(reactRootDiv)
  reactRoot.render(<App />)
}

reactMainRender()
