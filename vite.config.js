import { defineConfig } from 'vite';

export default defineConfig({
  base: './',  // IMPORTANT for CDN + relative paths
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(
      new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '.').substring(0,14)
    )
  }
});
