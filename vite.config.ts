import { defineConfig } from 'vite';

// base './' so the build works from any folder: GitHub Pages, an artifact, or memphyswater.com/game/
export default defineConfig({
  base: './',
  // stamped into asset URLs so a new deploy never pairs fresh code with stale cached art or audio
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
  server: { host: true },
});
