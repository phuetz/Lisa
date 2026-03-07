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

// https://vitejs.dev/config/
export default defineConfig({
  // Tauri expects a fixed port for devUrl
  server: {
    port: 5180,
    strictPort: true,
  },
  plugins: [react(), visionStatePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@agents': path.resolve(__dirname, './src/features/agents')
    }
  },
  // Tauri uses `dist` by default for frontendDist
  build: {
    // Tauri uses Chromium on Windows via WebView2, so target modern
    target: ['es2021', 'chrome100', 'safari15'],
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'sql-vendor': ['sql.js'],
          'ui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'state-vendor': ['zustand', 'rxjs'],
          'markdown-vendor': ['react-markdown', 'rehype-highlight', 'rehype-katex', 'remark-gfm', 'remark-math', 'katex', 'highlight.js/lib/core'],
          'charts-vendor': ['recharts'],
          'flow-vendor': ['reactflow'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'ml-vendor': ['@tensorflow/tfjs', '@xenova/transformers'],
          'mediapipe-vendor': ['@mediapipe/tasks-vision', '@mediapipe/tasks-audio'],
          'monaco-vendor': ['@monaco-editor/react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  // Env prefix for Tauri env vars
  envPrefix: ['VITE_', 'TAURI_'],
  // Test config lives in vitest.config.ts
});
