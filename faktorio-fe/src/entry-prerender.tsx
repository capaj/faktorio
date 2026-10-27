// Build-time prerender of the public landing page (see prerenderLandingPage in vite.config.ts).
// The browser still renders the app with createRoot; this HTML is only what visitors
// and crawlers see before the JavaScript has loaded.
import { renderToString } from 'react-dom/server'
import { Router } from 'wouter'
import App from './App'

export function render(path: string) {
  return renderToString(
    <Router ssrPath={path}>
      <App />
    </Router>
  )
}
