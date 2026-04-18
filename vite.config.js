import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ include: /\.(jsx?|tsx?)$/ })],
  base: './',
  build: {
    outDir: 'dist/renderer'
  },
  server: {
    port: 5173
  }
})
