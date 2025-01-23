import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
// @ts-ignore
import { getGitHash } from '../src/getGitHash'

const gitHash = getGitHash()

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [react(), tailwindcss()],
  server: {
    cors: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return `vendor_${gitHash}`
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
