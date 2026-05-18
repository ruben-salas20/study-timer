// UpdatePrompt.tsx — "new version available" banner for the PWA.
//
// vite-plugin-pwa runs in registerType:'prompt' mode. When a new service
// worker has installed and is waiting, useRegisterSW flips needRefresh to
// true. We surface a banner; tapping "Actualizar" calls
// updateServiceWorker(true), which posts SKIP_WAITING to the waiting SW (see
// src/pwa/sw.ts) and reloads the page onto the fresh build.
//
// Why this exists: with the old autoUpdate strategy a deploy could either
// reload the app silently mid-session, or — when that reload was missed —
// leave the user pinned to a stale bundle ("se queda pegada"). A prompt is
// reliable and never interrupts the user.
//
// Reliability: by default the browser only checks for a new SW on navigation.
// A PWA left open for days would never notice a deploy, so onRegisteredSW
// polls registration.update() hourly and again whenever the tab regains
// visibility.
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Long-lived installs only re-check the SW on navigation by default —
      // poll explicitly so a deploy is noticed within the hour...
      setInterval(() => {
        void registration.update()
      }, UPDATE_CHECK_INTERVAL_MS)
      // ...and immediately whenever the user comes back to the tab.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update()
        }
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="banner"
      aria-label="Actualización disponible"
      className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-current/15 bg-background shadow-lg px-4 py-3 flex items-start gap-3"
    >
      <RefreshCw size={18} className="text-(--color-primary) mt-0.5 shrink-0" />

      <div className="flex-1">
        <p className="text-sm font-semibold">Nueva versión disponible</p>
        <p className="text-xs opacity-60 mt-0.5">
          Actualizá para tener las últimas mejoras
        </p>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="mt-2 text-xs font-semibold text-(--color-primary)"
        >
          Actualizar →
        </button>
      </div>

      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => setNeedRefresh(false)}
        className="p-1 opacity-40 hover:opacity-70 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  )
}
