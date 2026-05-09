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

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// ── Update lifecycle: take control of clients ASAP and reload them ──────────
// Without skipWaiting/clientsClaim, new SW versions sit "waiting" until every
// tab is closed. On activate, we also tell every controlled client to reload
// so they pick up the new bundle immediately — without this, even after the
// new SW activates, the page keeps running the old JS from the previous load
// until the user manually refreshes.
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(async () => {
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        // Tell each open page to reload so it loads the fresh JS bundle
        ;(client as WindowClient).navigate(client.url).catch(() => {})
      }
    })
  )
})

// ── Precaching ───────────────────────────────────────────────────────────────

// self.__WB_MANIFEST is replaced at build time by vite-plugin-pwa
// with the list of assets to precache. Removing this line breaks injectManifest.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Navigation fallback (SPA) ────────────────────────────────────────────────
// All navigation requests fall back to the precached index.html so React Router
// can handle client-side routing without server round-trips.

const handler = createHandlerBoundToURL('/index.html')

// Wrap the SPA-shell handler so offline navigations fall back to /offline.html
const navigationHandler = async (params: Parameters<typeof handler>[0]) => {
  try {
    return await handler(params)
  } catch {
    // Network failed AND no cached shell — serve the offline page if cached
    const cache = await caches.open('app-shell-cache')
    const offline = await cache.match('/offline.html')
    if (offline) return offline
    // Last resort: a minimal inline response so we never throw
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Sin conexión</title><p>Sin conexión.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}

const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//, /^\/_\//, /^\/realtime/, /^\/push\//],
})
registerRoute(navigationRoute)

// ── Runtime caching ──────────────────────────────────────────────────────────

// PocketBase API — NetworkOnly: never cache user/session/friend/challenge data.
// Caching API responses caused stale UI bugs (e.g. weekly stats stuck at 0
// after sessions completed). The network is fast enough that no cache is
// needed here. Offline mode for API calls is out of scope for now.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/collections/'),
  new NetworkOnly()
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

// App shell (scripts, styles) — NetworkFirst with short cache fallback.
// We had stale-cache bugs where users kept running old bundles after a deploy.
// NetworkFirst always tries network first; only falls back to cache if offline.
registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'app-shell-cache' })
)
// Note: we also use precacheAndRoute(self.__WB_MANIFEST) above which precaches
// the build's hashed assets. After deploy, vite-plugin-pwa autoUpdate triggers
// a SW update, the new SW skipWaits, activates, and reloads all clients
// (see activate listener above) so the new bundle takes over immediately.

// ── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = (data.title as string | undefined) || 'Cuyodoro'
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
