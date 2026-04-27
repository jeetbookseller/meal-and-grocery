import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/meal-and-grocery/',
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Meal & Grocery Planner',
        short_name: 'Grocery',
        theme_color: '#2383E2',
        background_color: '#F7F7F5',
        display: 'standalone',
        scope: '/meal-and-grocery/',
        start_url: '/meal-and-grocery/',
        icons: [
          {
            src: '/meal-and-grocery/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/meal-and-grocery/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/meal-and-grocery/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
