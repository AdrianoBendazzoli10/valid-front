import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/analisar': 'https://valid-back.onrender.com',
      '/valid': 'https://valid-back.onrender.com',
      '/results': 'https://valid-back.onrender.com',
    },
  },
})
