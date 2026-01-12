import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 如果部署到服务器，base 应该是 '/'；如果部署到 GitHub Pages，base 应该是 '/crazy-farm-price-calculator/'
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})

