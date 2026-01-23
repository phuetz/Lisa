import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['react'],
  },
  {
    entry: {'visionWorker': 'src/worker/visionWorker.ts'},
    format: ['iife'], // Worker must be immediately invoked function expression or esm
    platform: 'browser',
    clean: false,
    outDir: 'dist',
    noExternal: ['@tensorflow/tfjs', '@tensorflow/tfjs-converter'], // Bundle TFJS inside the worker
  }
]);