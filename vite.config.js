import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/analisar': 'https://eocr-pixel-mescla-production.up.railway.app/',
      '/valid': 'https://eocr-pixel-mescla-production.up.railway.app/',
      '/results': 'https://eocr-pixel-mescla-production.up.railway.app/',
    },
  },
})
