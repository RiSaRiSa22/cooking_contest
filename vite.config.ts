import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/guide/static-deploy#github-pages
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/cooking_contest/',
  resolve: {
    alias: { '@': '/src' },
  },
})
