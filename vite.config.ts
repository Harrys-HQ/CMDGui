/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'xterm-vendor': [
            'xterm',
            'xterm-addon-fit',
            'xterm-addon-search',
            '@xterm/addon-canvas',
            '@xterm/addon-webgl',
            '@xterm/addon-serialize',
          ],
          'ui-vendor': [
            'react',
            'react-dom',
            'lucide-react',
            'react-resizable-panels',
            'react-window',
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
