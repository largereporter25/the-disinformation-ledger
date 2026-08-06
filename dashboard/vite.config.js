import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    // The landing-page function serves the first HTML document so crawlers get
    // live, database-backed KPIs. Keep the entry CSS and JS paths stable so
    // that document can boot the normal Vite application without needing to
    // know this build's content hashes.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        assetFileNames: (asset) => (
          asset.name && asset.name.endsWith('.css')
            ? 'assets/app.css'
            : 'assets/[name]-[hash][extname]'
        ),
      },
    },
  },
});
