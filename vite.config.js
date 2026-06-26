import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so all asset paths work from MikroTik /flash/hotspot/
  base: './',
  build: {
    // Output JS/CSS flat alongside login.html — no assets/ subfolder
    // so files can be dropped directly into /flash/hotspot/ without subdirectories
    assetsDir: '',
    rollupOptions: {
      output: {
        assetFileNames: '[name]-[hash][extname]',
        chunkFileNames: '[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
      },
    },
  },
})
