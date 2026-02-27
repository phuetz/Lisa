import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Middleware to expose Zustand store as REST endpoint during dev
function visionStatePlugin() {
  return {
    name: 'vision-state-api',
    configureServer(server: any) {
      server.middlewares.use('/api/vision/state', async (_req: any, res: any) => {
        const { useAppStore } = await import(path.resolve(__dirname, 'src/store/appStore'));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(useAppStore.getState()));
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
  const csp = `default-src 'self' https://accounts.google.com https://www.googleapis.com; img-src 'self' data: blob:; ${scriptSrc}; ${workerSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' data: ws://localhost:* http://localhost:* https://api.openai.com https://generativelanguage.googleapis.com https://api.anthropic.com https://accounts.google.com https://cdn.jsdelivr.net https://storage.googleapis.com https://google.serper.dev https://api.duckduckgo.com https://www.googleapis.com`;

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
  server: {
    port: 5180,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Updated: @agents now points to the new features/agents location
      '@agents': path.resolve(__dirname, './src/features/agents')
    }
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // SQLite WASM
          'sql-vendor': ['sql.js'],
          // UI libraries
          'ui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // State management
          'state-vendor': ['zustand', 'rxjs'],
          // Markdown & code rendering
          'markdown-vendor': ['react-markdown', 'rehype-highlight', 'rehype-katex', 'remark-gfm', 'remark-math', 'katex', 'highlight.js/lib/core'],
          // Charts
          'charts-vendor': ['recharts'],
          // Flow editor (Workflows page only)
          'flow-vendor': ['reactflow'],
          // 3D rendering
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          // ML/AI libraries (lazy loaded)
          'ml-vendor': ['@tensorflow/tfjs', '@xenova/transformers'],
          // MediaPipe
          'mediapipe-vendor': ['@mediapipe/tasks-vision', '@mediapipe/tasks-audio'],
          // PDF & Office — loaded on-demand via dynamic imports, no manualChunks needed
          // Monaco editor
          'monaco-vendor': ['@monaco-editor/react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  // Test config lives in vitest.config.ts — do not duplicate here
});
