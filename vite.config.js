import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 8900,
    proxy: {
      '/cf-api': {
        target: 'https://api.cloudflare.com/client/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cf-api/, ''),
        headers: {
          'Origin': 'https://api.cloudflare.com'
        }
      }
    }
  }
})
