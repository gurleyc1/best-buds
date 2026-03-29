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
  server: { port: 3000, open: '/game.html' },
  plugins: [
    {
      name: 'game-url-hint',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const port = (server.httpServer?.address() as { port: number })?.port ?? 3000;
          console.log(`\n  🎮  Game:  http://localhost:${port}/game.html\n`);
        });
      },
    },
  ],
});
