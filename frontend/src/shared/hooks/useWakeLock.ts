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

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    // Older lib.dom releases didn't include WakeLock in Navigator at all,
    // so feature-detect at runtime instead of relying on TS narrowing.
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLock }).wakeLock
    if (!wakeLock || !enabled) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      try {
        const s = await wakeLock!.request('screen')
        if (cancelled) {
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
      if (
        document.visibilityState === 'visible' &&
        (!sentinel || sentinel.released)
      ) {
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
