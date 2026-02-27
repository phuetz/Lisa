import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@agents': path.resolve(__dirname, './src/features/agents'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    // Prevent EMFILE errors on Windows by pre-bundling heavy deps
    deps: {
      optimizer: {
        web: {
          include: ['@mui/icons-material', '@mui/material'],
        },
      },
    },
    // Avoid dual-React issues when MUI components run in parallel
    fileParallelism: false,
  },
});
