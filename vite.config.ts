import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
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
  return {
    name: 'csp-headers',
    configureServer(server: any) {
      server.middlewares.use((_: any, res: any, next: any) => {
        res.setHeader('Content-Security-Policy', "default-src 'self' https://accounts.google.com https://www.googleapis.com; img-src 'self' data:; script-src 'self' https://accounts.google.com gsi.gstatic.com; style-src 'self' 'unsafe-inline'");
        next();
      });
    },
    transformIndexHtml(html: string) {
      const meta = `<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self' https://accounts.google.com https://www.googleapis.com; img-src 'self' data:; script-src 'self' https://accounts.google.com gsi.gstatic.com; style-src 'self' 'unsafe-inline'\">`;
      return html.replace('<head>', `<head>${meta}`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), visionStatePlugin(), cspPlugin()],
  assetsInclude: ['**/*.wasm', '**/*.tflite', '**/*.task'],
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
