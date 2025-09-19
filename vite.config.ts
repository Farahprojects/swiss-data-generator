import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Preview compatibility config - redirects to main app
export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 8080,
    open: '/main-app/',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './main-app/src'),
    },
  },
})
