import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: ['src/renderer/src/**/*.test.ts', 'src/main/**/*.test.ts'],
    setupFiles: ['./src/renderer/src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/main/**/*.ts',
        'src/renderer/src/features/**/*.ts',
        'src/renderer/src/state/**/*.ts',
        'src/renderer/src/i18n/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        'src/main/index.ts',
        'src/main/ipc/index.ts',
        'src/main/printing/bridge-manager.ts',
        'src/main/bluetooth/open-settings.ts',
        'src/main/logger.ts',
        'src/main/settings/store.ts',
        'src/main/paths.ts',
        'src/renderer/src/features/preview/pdf.ts',
        'src/renderer/src/features/preview/pdfjs-polyfills.ts',
        'src/renderer/src/features/preview/pdf-worker-install.ts',
        'src/renderer/src/features/editor/rasterize.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
});
