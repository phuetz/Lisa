import { defineConfig, type ViteDevServer, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';

// Ensure __dirname is available under ESM (package.json has type:module)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware to expose Zustand store as REST endpoint during dev
function visionStatePlugin() {
  const plugin: Plugin = {
    name: 'vision-state-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/vision/state', async (_req: IncomingMessage, res: ServerResponse) => {
        const { useVisionAudioStore } = await import(path.resolve(__dirname, 'src/store/visionAudioStore'));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(useVisionAudioStore.getState()));
      });
    },
  };
  return plugin;
}

// CSP plugin - disabled in development to avoid blocking ML model CDNs
function cspPlugin() {
  const plugin: Plugin = {
    name: 'csp-headers',
    configureServer(server: ViteDevServer) {
      // No CSP headers in dev - too many external CDNs for ML models
      server.middlewares.use((_: IncomingMessage, _res: ServerResponse, next: () => void) => {
        next();
      });
    },
    transformIndexHtml(html: string) {
      // Only add CSP meta tag in production
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        return html; // No CSP in dev
      }
      const cspContent = "default-src 'self' https: wss:; connect-src 'self' https: wss: data: blob:; img-src 'self' data: blob: https:; worker-src 'self' blob:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:; style-src 'self' 'unsafe-inline'";
      const meta = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;
      return html.replace('<head>', `<head>${meta}`);
    },
  };
  return plugin;
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
  build: {
    // Optimisation du bundle
    minify: 'esbuild',
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core - highest priority, must load first
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          
          // All React-dependent UI libraries go together
          if (id.includes('@mui/') || 
              id.includes('@emotion/') ||
              id.includes('lucide-react') ||
              id.includes('framer-motion') ||
              id.includes('react-markdown') ||
              id.includes('react-syntax-highlighter') ||
              id.includes('recharts')) {
            return 'vendor-ui';
          }
          
          // State management
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          
          // MediaPipe (largest libs - lazy loaded)
          if (id.includes('@mediapipe/tasks-vision')) {
            return 'vendor-mediapipe-vision';
          }
          if (id.includes('@mediapipe/tasks-audio')) {
            return 'vendor-mediapipe-audio';
          }
          
          // Three.js (3D rendering)
          if (id.includes('node_modules/three') || id.includes('@react-three')) {
            return 'vendor-three';
          }
          
          // Utilities
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/uuid')) {
            return 'vendor-utils';
          }
          
          // Agents
          if (id.includes('src/agents/')) {
            return 'feature-agents';
          }
        },
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps en production
    sourcemap: false,
    // Optimisation CSS
    cssCodeSplit: true,
    // Optimisation des assets
    assetsInlineLimit: 4096,
    // Rapport de build
    reportCompressedSize: true,
  },
  // Optimisation du dev server
  server: {
    port: 5180,
    strictPort: true,
    middlewareMode: false,
    preTransformRequests: true,
    // Proxy pour LM Studio (contourne CORS)
    proxy: {
      '/lmstudio': {
        target: 'http://localhost:1234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lmstudio/, ''),
      },
    },
  },
  // Optimisation de la preview
  preview: {
    port: 4173,
  },
});
