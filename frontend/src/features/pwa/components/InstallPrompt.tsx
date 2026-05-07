// InstallPrompt.tsx — PWA install banner (F6)
//
// Behaviour:
//   - Desktop/Android Chrome: listens to `beforeinstallprompt`, shows a CTA
//     banner. On dismiss, stores the decision in localStorage for 7 days.
//   - iOS Safari: detects via user-agent (no `beforeinstallprompt` support),
//     shows manual instructions: "Tocá Compartir → Agregar a pantalla de inicio".
//   - Already installed (standalone mode): renders nothing.
//
// This component is mounted at the app shell level — it renders conditionally
// based on whether install is relevant and not yet dismissed.

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const DISMISS_KEY = 'install-prompt-dismissed-at'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** Returns true if running as an installed PWA (standalone or fullscreen display mode) */
function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari sets this when launched from home screen
    ('standalone' in window.navigator &&
      (window.navigator as Record<string, unknown>).standalone === true)
  )
}

/** Returns true if the user is on iOS Safari (no beforeinstallprompt support) */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
}

/** Returns true if the install prompt was dismissed within the last 7 days */
function isRecentlyDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY)
    if (!ts) return false
    return Date.now() - Number(ts) < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

function saveDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // localStorage may be unavailable in some private browsing modes
  }
}

// Extend Window to include the non-standard beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [dismissed, setDismissed] = useState(isRecentlyDismissed)

  useEffect(() => {
    // Don't show if already installed or recently dismissed
    if (isStandaloneMode() || dismissed) return

    if (isIOSSafari()) {
      setShowIOSHint(true)
      return
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [dismissed])

  function handleDismiss() {
    saveDismissed()
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIOSHint(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  // Nothing to show
  if (dismissed || (!deferredPrompt && !showIOSHint)) return null

  return (
    <div
      role="banner"
      aria-label="Instalar aplicación"
      className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border border-current/15 bg-background shadow-lg px-4 py-3 flex items-start gap-3"
    >
      <div className="flex-1">
        {showIOSHint ? (
          <>
            <p className="text-sm font-semibold">Instalar Study Timer</p>
            <p className="text-xs opacity-60 mt-0.5">
              Tocá <strong>Compartir</strong> → <strong>Agregar a pantalla de inicio</strong>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Instalar Study Timer</p>
            <p className="text-xs opacity-60 mt-0.5">
              Accedé más rápido desde tu pantalla de inicio
            </p>
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="mt-2 text-xs font-semibold text-(--color-primary)"
            >
              Instalar →
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        aria-label="Cerrar"
        onClick={handleDismiss}
        className="p-1 opacity-40 hover:opacity-70 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  )
}
