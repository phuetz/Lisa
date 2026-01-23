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
    entry: {
      'hearingWorker': 'src/worker/hearingWorker.ts',
      'audioProcessor': 'src/worker/audioProcessor.ts'
    },
    format: ['iife'], 
    platform: 'browser',
    clean: false,
    outDir: 'dist',
    noExternal: ['@xenova/transformers'],
  }
]);