// useWakeLock.ts — keep the device screen on while a flag is true.
//
// Wraps the Screen Wake Lock API (navigator.wakeLock). Behavior:
//   - When `enabled` becomes true, request a screen wake lock
//   - When `enabled` becomes false, release the lock
//   - The browser automatically releases the lock when the document becomes
//     hidden (tab switch, screen off). We listen to visibilitychange so we
//     re-acquire the lock when the user returns and `enabled` is still true.
//
// Browser support: Chrome 84+, Safari 16.4+, Firefox 126+. The hook
// gracefully no-ops on browsers without the API.
import { useEffect } from 'react'

interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>
  }
}

interface WakeLockSentinelLike {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    const nav = navigator as NavigatorWithWakeLock
    if (!nav.wakeLock || !enabled) return

    let sentinel: WakeLockSentinelLike | null = null
    let cancelled = false

    async function acquire() {
      try {
        const s = await nav.wakeLock!.request('screen')
        if (cancelled) {
          // Effect was torn down between the request and resolution
          await s.release().catch(() => {})
          return
        }
        sentinel = s
      } catch (err) {
        // Permission denied, low battery, etc. — silent: feature is optional.
        console.warn('[wake-lock] acquire failed:', err)
      }
    }

    function onVisibility() {
      // The browser auto-releases the lock when the page is hidden.
      // Re-acquire when it becomes visible again.
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => {})
      }
      sentinel = null
    }
  }, [enabled])
}
