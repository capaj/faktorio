import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { ClerkProvider } from '@clerk/clerk-react'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key')
}

if (
  PUBLISHABLE_KEY.includes('pk_live') &&
  location.host.includes('localhost')
) {
  throw new Error('Publishable key must start with pk_test')
}

let reactRoot: ReactDOM.Root

export const reactMainRender = () => {
  const reactRootDiv = document.getElementById('root')!

  if (reactRoot) {
    reactRoot.unmount()
  }

  reactRoot = ReactDOM.createRoot(reactRootDiv)
  reactRoot.render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  )
}

reactMainRender()
