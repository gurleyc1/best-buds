import { defineConfig } from 'vite';
import path from 'path';
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: path.resolve(__dirname, 'game.html'),
    },
  },
  server: { port: 3000 },
});
