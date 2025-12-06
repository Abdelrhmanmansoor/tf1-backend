import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    middlewareMode: false,
    middlewares: [
      // Block access to sensitive directories
      (req, res, next) => {
        const forbiddenPaths = ['/.git', '/.env', '/node_modules', '/.replit', '/.vscode'];
        if (forbiddenPaths.some(path => req.url.startsWith(path))) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        next();
      }
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
