import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/public/**']
    }
  },
  plugins: [
    react(), 
    tailwindcss(), 
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Akula Ajay - Ward 2 Venkayammapeta', 
        short_name: 'Akula Ajay', 
        description: 'Akula Ajay campaign portal, voter roll, canvassing slips, party analytics, and booth field operations',
        theme_color: '#1e40af', 
        background_color: '#0f172a', 
        display: 'standalone', 
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/ajy-app-icon.png',
            sizes: '192x192 256x256 512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: { navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//] }
    })
  ]
})
