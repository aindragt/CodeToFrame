import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/code.ts'),
      formats: ['iife'],
      name: 'CodeToFrame',
      fileName: () => 'code.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'code.js',
        extend: true
      },
    },
  },
});

