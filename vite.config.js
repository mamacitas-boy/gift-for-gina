import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work at both https://user.github.io/ and
  // https://user.github.io/repository-name/ without a repo-name edit.
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three'],
  },
});
