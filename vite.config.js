import { defineConfig } from 'vite';

export default defineConfig({
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
