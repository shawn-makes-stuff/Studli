import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brick.png'],
      manifest: {
        name: 'Studli',
        short_name: 'Studli',
        description: '3D brick builder',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        scope: './',
        start_url: './',
        icons: [
          { src: 'brick.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  base: './',
})
