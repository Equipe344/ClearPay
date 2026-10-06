import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // While the Django + DRF backend is being built, requests to /api
      // can be proxied straight to it during local development.
      // Uncomment once the backend is running:
      // '/api': {
      //   target: 'http://127.0.0.1:8000',
      //   changeOrigin: true,
      // },
    },
  },
})
