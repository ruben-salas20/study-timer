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

// ── Update lifecycle: controlled, prompt-based updates ─────────────────────
// vite-plugin-pwa runs in registerType:'prompt' mode. A freshly built SW
// installs and then WAITS — it deliberately does NOT call skipWaiting on its
// own, so the running app is never reloaded out from under the user (which
// could cut a study timer mid-session).
//
// The in-app UpdatePrompt banner asks the user to update. When they accept,
// the page posts a SKIP_WAITING message to this waiting SW; only then do we
// skipWaiting and hand over.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Once the new SW activates (after SKIP_WAITING), take control of open clients.
// The page reload itself is driven by vite-plugin-pwa's registration, which
// listens for `controllerchange` — so we must NOT navigate clients here, or it
// would race with that reload.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
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
// the build's hashed assets. After a deploy, the registration polls for the
// new SW; once it has installed and is waiting, the UpdatePrompt banner asks
// the user to apply it (see the SKIP_WAITING message handler above).

// ── Push notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = (data.title as string | undefined) || 'Cuyodoro'
  const options: NotificationOptions = {
    body: (data.body as string | undefined) ?? '',
    icon: '/icons/icon-192x192.png',
    // Android masks the badge to a monochrome alpha silhouette. The full-
    // colour icon ends up rendered as a solid white square because every
    // pixel is opaque. Use a dedicated mostly-transparent badge so the cuy
    // outline survives the mask.
    badge: '/icons/notification-badge.png',
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
