import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: ['src/renderer/src/**/*.test.ts', 'src/main/**/*.test.ts'],
    setupFiles: ['./src/renderer/src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
});
