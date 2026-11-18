import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // P8-B: iconos reales (antes se declaraban pwa-192/512 y masked-icon.svg, que no existían).
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'notification-badge-96x96.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // P8-B: UN solo service worker. El de Workbox (caché y actualizaciones) importa los manejadores de Web Push.
        // Antes /sw-push.js se registraba aparte en el mismo ámbito «/» y se sustituían entre sí: el SW activo
        // (sw.js) no tenía manejador «push».
        importScripts: ['sw-push.js'],
      },
      manifest: {
        name: 'Havita',
        short_name: 'Havita',
        description: 'Plataforma de gestión de unidades residenciales',
        theme_color: '#ffffff',
        // P8-B: la app instalada abre /app (portal del rol o inicio de sesión), no «/» (página comercial sin acceso).
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:9094',
        changeOrigin: false,
      },
    },
  },
})
