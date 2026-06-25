import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so all asset paths work from MikroTik /flash/hotspot/
  base: './',
})
