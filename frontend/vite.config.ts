/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Tailwind CSS v4 — no tailwind.config.ts; config lives in global.css @theme block
    tailwindcss(),
    // vite-plugin-pwa 0.21.x — F6: injectManifest strategy with custom SW
    // The custom SW at src/pwa/sw.ts handles:
    //   - Workbox precaching (self.__WB_MANIFEST injection)
    //   - Runtime caching (API NetworkFirst, images CacheFirst, etc.)
    //   - Web Push event listeners (push, notificationclick)
    //
    // injectManifest requires:
    //   - strategies: 'injectManifest'
    //   - srcDir: directory containing the custom SW source
    //   - filename: the SW source filename
    //   - The source file MUST contain self.__WB_MANIFEST (injection point)
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      includeAssets: ['icons/*.png'],
      // manifest is served from /manifest.webmanifest in public/
      // vite-plugin-pwa merges this config with the static file or generates one
      manifest: {
        name: 'Study Timer',
        short_name: 'StudyTimer',
        description: 'Temporizador de estudio competitivo con amigos',
        theme_color: '#7c9a82',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['productivity', 'education'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      // injectManifest mode — workbox config passed to injectManifest()
      injectManifest: {
        // Inject the asset manifest into self.__WB_MANIFEST
        injectionPoint: 'self.__WB_MANIFEST',
        // Exclude realtime endpoint from precaching
        globIgnores: ['**/api/realtime/**'],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
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
