import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Tailwind CSS v4 — no tailwind.config.ts; config lives in global.css @theme block
    tailwindcss(),
    // vite-plugin-pwa 0.21.x with generateSW strategy
    // injectManifest strategy will be used in F6 (push notifications)
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Study Timer',
        short_name: 'StudyTimer',
        description: 'Competitive study timer PWA for friends',
        theme_color: '#7c9a82',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Never cache realtime/SSE endpoint — PocketBase realtime requires live connection
        navigateFallbackDenylist: [/^\/api\/realtime/],
        runtimeCaching: [
          {
            // PocketBase API — network first with cache fallback
            urlPattern: /^https?:\/\/.*\/api\/collections\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pb-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
  test: {
    // Vitest configuration — jsdom environment for React component testing
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
