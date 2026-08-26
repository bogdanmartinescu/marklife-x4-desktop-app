import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const workspaceAliases = {
  '@thermalbridge/thermal-core': resolve(__dirname, '../../packages/thermal-core/src/index.ts'),
  '@thermalbridge/shared/ipc': resolve(__dirname, '../../packages/shared/src/ipc.ts'),
  '@thermalbridge/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
  '@thermalbridge/printer-profiles': resolve(
    __dirname,
    '../../packages/printer-profiles/src/index.ts',
  ),
};

const workspacePackages = [
  '@thermalbridge/thermal-core',
  '@thermalbridge/shared',
  '@thermalbridge/printer-profiles',
];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
    resolve: { alias: workspaceAliases },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
    resolve: { alias: workspaceAliases },
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          inlineDynamicImports: true,
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@renderer': resolve('src/renderer/src'),
        ...workspaceAliases,
      },
    },
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      // Prebundling strips pdf.js worker side effects (globalThis.pdfjsWorker).
      exclude: ['pdfjs-dist'],
    },
  },
});
