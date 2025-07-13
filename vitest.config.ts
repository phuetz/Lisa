import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({

  plugins: [react()] as any,
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.ts'],
  },
});
