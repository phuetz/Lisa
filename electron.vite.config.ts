import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
          chunkFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'sql-vendor': ['sql.js'],
            'ui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            'state-vendor': ['zustand', 'rxjs'],
            'markdown-vendor': ['react-markdown', 'rehype-highlight', 'rehype-katex', 'remark-gfm', 'remark-math', 'katex', 'highlight.js'],
            'charts-vendor': ['recharts', 'reactflow'],
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            'ml-vendor': ['@tensorflow/tfjs', '@xenova/transformers'],
            'mediapipe-vendor': ['@mediapipe/tasks-vision', '@mediapipe/tasks-audio'],
            'office-vendor': ['pdfjs-dist', 'mammoth', 'xlsx', 'jspdf', 'html2canvas'],
            'monaco-vendor': ['@monaco-editor/react'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    plugins: [react()],
    optimizeDeps: {
      exclude: ['sql.js'],
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@agents': resolve(__dirname, './src/features/agents'),
      },
    },
    server: {
      port: 5180,
      strictPort: true,
    },
  },
});
