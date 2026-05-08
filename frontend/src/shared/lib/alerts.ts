// alerts.ts — Multi-channel notifications when a timer phase ends.
//
// Three channels (best-effort, all optional):
//   1. Audio:        synthesised beep via Web Audio API (no asset bundle cost)
//   2. Notification: browser/system Notification API (works in background)
//   3. Vibration:    navigator.vibrate (mobile only)
//
// All gated by user preference in localStorage so the user can disable them
// if they're studying in a library, etc.

const ENABLED_KEY = 'studytimer:alerts-enabled'

export type AlertSeverity = 'soft' | 'normal' | 'strong'

export function alertsEnabled(): boolean {
  // Default: ON. User can disable from Settings.
  return localStorage.getItem(ENABLED_KEY) !== 'false'
}

export function setAlertsEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
}

// ── Audio (Web Audio synthesised tones) ─────────────────────────────────────

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window || 'webkitAudioContext' in window)) {
    return null
  }
  if (!audioCtx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  // Resume if suspended (some browsers suspend until user gesture)
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

/** Play a single tone. Frequency in Hz, duration in seconds. */
function tone(freq: number, durationSec: number, gain = 0.15): void {
  const ctx = getCtx()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const g = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = freq

  // Smooth envelope to avoid clicks
  g.gain.setValueAtTime(0, ctx.currentTime)
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01)
  g.gain.setValueAtTime(gain, ctx.currentTime + durationSec - 0.05)
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec)

  osc.connect(g).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + durationSec)
}

/** Play a short alert chime. Pattern depends on severity. */
export function playAlert(severity: AlertSeverity = 'normal'): void {
  if (!alertsEnabled()) return

  switch (severity) {
    case 'soft':
      // Pomodoro work → break: gentle two-note descent
      tone(660, 0.18)
      setTimeout(() => tone(550, 0.22), 200)
      break

    case 'normal':
      // Pomodoro break → next work: rising two-note "go again"
      tone(550, 0.18)
      setTimeout(() => tone(770, 0.22), 200)
      break

    case 'strong':
      // Countdown done / pomodoro fully complete: triple chime
      tone(880, 0.2)
      setTimeout(() => tone(880, 0.2), 250)
      setTimeout(() => tone(1100, 0.4), 500)
      break
  }
}

// ── Notification API ────────────────────────────────────────────────────────

interface NotifyOptions {
  title: string
  body?: string
  tag?: string
}

/** Show a browser notification if permission granted. Silent fail otherwise. */
export function notify({ title, body, tag }: NotifyOptions): void {
  if (!alertsEnabled()) return
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  try {
    const notif = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: tag ?? 'studytimer-alert',
      // Vibrate the device too if supported
      // (TS doesn't include vibrate in NotificationOptions yet, cast)
      ...(({ vibrate: [200, 100, 200] } as unknown) as Record<string, unknown>),
    })
    // Auto-dismiss after 8s so they don't pile up
    setTimeout(() => notif.close(), 8000)
  } catch {
    /* notification creation can throw on some platforms (Safari quirks) — ignore */
  }
}

// ── Vibration (mobile) ──────────────────────────────────────────────────────

/** Vibrate the device. Pattern is alternating ON/OFF in ms. */
export function vibrate(pattern: number | number[] = [200, 100, 200]): void {
  if (!alertsEnabled()) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* not supported on iOS Safari etc — ignore */
  }
}

// ── Composite events ────────────────────────────────────────────────────────

/** Pomodoro work phase ended — time for a break. */
export function alertWorkPhaseEnded(): void {
  playAlert('soft')
  vibrate([100, 50, 100])
  notify({
    title: '🌿 Pausa',
    body: 'Tomá un break, te lo ganaste.',
    tag: 'pomodoro-break',
  })
}

/** Pomodoro break ended — back to focus. */
export function alertBreakEnded(): void {
  playAlert('normal')
  vibrate([150, 50, 150])
  notify({
    title: '⏱️ De vuelta al foco',
    body: 'Empezá la siguiente sesión cuando estés listo.',
    tag: 'pomodoro-work',
  })
}

/** Countdown reached zero or pomodoro fully completed. */
export function alertSessionComplete(reason: 'countdown' | 'pomodoro'): void {
  playAlert('strong')
  vibrate([300, 100, 300, 100, 300])
  notify({
    title: reason === 'countdown' ? '⏰ Tiempo cumplido' : '🎯 Sesión completada',
    body:
      reason === 'countdown'
        ? 'El tiempo del cronómetro regresivo terminó.'
        : '¡Completaste todos los ciclos del pomodoro!',
    tag: 'session-complete',
  })
}

/**
 * Request notification permission. Returns the resulting permission state.
 * Should be called from a user gesture (e.g., a "Habilitar alertas" toggle).
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  return Notification.requestPermission()
}
