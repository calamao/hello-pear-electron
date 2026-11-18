import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = process.cwd()

export default defineConfig({
  root: resolve(root, 'renderer'),
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: resolve(root, 'renderer-dist'),
    emptyOutDir: true
  }
})
