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
      },
      '/indexnow-api': {
        target: 'https://api.indexnow.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/indexnow-api/, '')
      }
    }
  },
  plugins: [
    {
      name: 'cors-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const urlObj = new URL(req.url, 'http://localhost');
          if (urlObj.pathname === '/fetch-url') {
            const targetUrl = urlObj.searchParams.get('url');
            if (!targetUrl) {
              res.writeHead(400, { 'Content-Type': 'text/plain' });
              res.end('Missing url parameter');
              return;
            }
            try {
              const response = await fetch(targetUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              });
              const contentType = response.headers.get('content-type') || 'text/plain';
              const text = await response.text();
              
              res.writeHead(response.status, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
              });
              res.end(text);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end(`Error fetching URL: ${err.message}`);
            }
          } else {
            next();
          }
        });
      }
    }
  ]
})
