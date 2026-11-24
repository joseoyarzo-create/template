import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Configuración de Vite para una app SPA estática (Cloudflare Pages).
// El build genera archivos estáticos en /dist, sin servidor propio.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Cloudflare Pages sirve el sitio; los assets se cachean por hash.
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    host: true,
  },
})
