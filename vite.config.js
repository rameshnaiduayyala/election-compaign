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
        name: 'Venkayammapeta Ward 2 Election Desk', 
        short_name: 'Akula Ajay', 
        description: 'Voter roll, canvassing slips, party analytics, and booth field operations',
        theme_color: '#1e40af', 
        background_color: '#0f172a', 
        display: 'standalone', 
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
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
