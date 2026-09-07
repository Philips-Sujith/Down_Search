import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VERCEL ? '/' : '/Down_Search/',
  server: {
    port: 5173,
    open: false,
    host: true,
    proxy: {
      '/api/doab': {
        target: 'https://directory.doabooks.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/doab/, '')
      }
    }
  }
});