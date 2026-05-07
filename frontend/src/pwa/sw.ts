/// <reference lib="webworker" />
// sw.ts — Custom Service Worker for Study Timer PWA (F6)
//
// Uses Workbox injectManifest strategy (vite-plugin-pwa).
// The self.__WB_MANIFEST placeholder is replaced by Vite during build with
// the list of precached assets. Do NOT remove it.
//
// Runtime caching strategy:
//   - app-shell/navigation:  StaleWhileRevalidate (fast loads, background refresh)
//   - PocketBase API:        NetworkFirst with 5s timeout (fresh data preferred)
//   - realtime/SSE:          NetworkOnly (never cache live connections)
//   - images:                CacheFirst (stable assets, max 50 entries, 30 days)
//
// Push event handling:
//   - Receives push payloads from push-service via Web Push protocol
//   - Displays notifications using the Notifications API
//   - notificationclick: focuses existing client or opens a new window

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import {
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
  NetworkOnly,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { createHandlerBoundToURL } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// ── Precaching ───────────────────────────────────────────────────────────────

// self.__WB_MANIFEST is replaced at build time by vite-plugin-pwa
// with the list of assets to precache. Removing this line breaks injectManifest.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Navigation fallback (SPA) ────────────────────────────────────────────────
// All navigation requests fall back to the precached index.html so React Router
// can handle client-side routing without server round-trips.

const handler = createHandlerBoundToURL('/index.html')
const navigationRoute = new NavigationRoute(handler, {
  // Never use the cached shell for PocketBase or push-service routes
  denylist: [/^\/api\//, /^\/_\//, /^\/realtime/, /^\/push\//],
})
registerRoute(navigationRoute)

// ── Runtime caching ──────────────────────────────────────────────────────────

// PocketBase API — NetworkFirst: always try the network, fall back to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/collections/'),
  new NetworkFirst({
    cacheName: 'pb-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
)

// PocketBase realtime — NetworkOnly: SSE connections must never be cached
registerRoute(
  ({ url }) => url.pathname === '/realtime' || url.pathname.startsWith('/api/realtime'),
  new NetworkOnly()
)

// Images — CacheFirst: icons and illustrations change rarely
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
)

// App shell (scripts, styles) — StaleWhileRevalidate: fast load + background refresh
registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'app-shell-cache' })
)

// ── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = (data.title as string | undefined) || 'Study Timer'
  const options: NotificationOptions = {
    body: (data.body as string | undefined) ?? '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: (data.tag as string | undefined) ?? 'study-timer',
    data: { url: (data.url as string | undefined) ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing client at the target URL if possible
        for (const client of clients) {
          if (client.url.includes(targetUrl)) {
            return client.focus()
          }
        }
        // No matching client — open a new window
        return self.clients.openWindow(targetUrl)
      })
  )
})
