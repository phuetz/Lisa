import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Middleware to expose Zustand store as REST endpoint during dev
function visionStatePlugin() {
  return {
    name: 'vision-state-api',
    configureServer(server: any) {
      server.middlewares.use('/api/vision/state', async (_req: any, res: any) => {
        const { useVisionAudioStore } = await import(path.resolve(__dirname, 'src/store/visionAudioStore'));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(useVisionAudioStore.getState()));
      });
    },
  };
}

// CSP plugin to send Content-Security-Policy headers & inject meta tag
function cspPlugin() {
  const isDev = process.env.NODE_ENV !== 'production';
  // In development, allow 'unsafe-inline' for Vite HMR scripts
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://accounts.google.com gsi.gstatic.com blob: https://cdn.jsdelivr.net"
    : "script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com gsi.gstatic.com blob: https://cdn.jsdelivr.net";
  const workerSrc = "worker-src 'self' blob: https://cdn.jsdelivr.net";
  const csp = `default-src 'self' https://accounts.google.com https://www.googleapis.com; img-src 'self' data: blob:; ${scriptSrc}; ${workerSrc}; style-src 'self' 'unsafe-inline'; connect-src 'self' data: ws://localhost:* http://localhost:* https://api.openai.com https://generativelanguage.googleapis.com https://api.anthropic.com https://accounts.google.com https://cdn.jsdelivr.net https://storage.googleapis.com`;

  return {
    name: 'csp-headers',
    configureServer(server: any) {
      server.middlewares.use((_: any, res: any, next: any) => {
        res.setHeader('Content-Security-Policy', csp);
        next();
      });
    },
    transformIndexHtml(html: string) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
      return html.replace('<head>', `<head>${meta}`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), visionStatePlugin(), cspPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@agents': path.resolve(__dirname, './src/agents')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: './src/test/setup.ts',
  },
});
