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
        name: 'Election Desk Management', 
        short_name: 'ElectionDesk', 
        description: 'Voter roll, party analytics, and booth field operations',
        theme_color: '#0f172a', 
        background_color: '#f8fafc', 
        display: 'standalone', 
        start_url: '/',
        icons: []
      },
      workbox: { navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//] }
    })
  ]
})
