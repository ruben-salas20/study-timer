// EnableNotificationsCTA.tsx — Push notification opt-in CTA (F6)
//
// Shown in /me or /settings after onboarding is completed.
// Only rendered when Notification.permission === 'default' (not yet asked).
// Hides itself after the user grants or denies permission.
//
// Props:
//   onPermissionChange?: (perm: NotificationPermission) => void

import { Bell, BellOff } from 'lucide-react'
import { usePushPermission } from '../hooks/usePushPermission'
import { usePushSubscription } from '../hooks/usePushSubscription'

interface EnableNotificationsCTAProps {
  /** Called after the user responds to the permission prompt */
  onPermissionChange?: (permission: NotificationPermission) => void
}

export function EnableNotificationsCTA({
  onPermissionChange,
}: EnableNotificationsCTAProps) {
  const { permission, request } = usePushPermission()
  const { subscribe } = usePushSubscription()

  // Only show the CTA when not yet decided
  if (permission !== 'default') return null

  async function handleEnable() {
    const result = await request()
    onPermissionChange?.(result)
    if (result === 'granted') {
      // Subscribe automatically after the user grants permission
      await subscribe()
    }
  }

  return (
    <div
      role="region"
      aria-label="Activar notificaciones"
      className="rounded-xl border border-current/15 px-4 py-3 flex items-start gap-3"
    >
      <span className="mt-0.5 text-(--color-primary)">
        <Bell size={18} />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">Activar notificaciones</p>
        <p className="text-xs opacity-60 mt-0.5">
          Recibí alertas de retos, solicitudes de amistad y más
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleEnable()}
        className="text-xs font-semibold text-(--color-primary) whitespace-nowrap"
      >
        Activar
      </button>
    </div>
  )
}

/** Small indicator shown when notifications are denied */
export function NotificationsDeniedBadge() {
  const { permission } = usePushPermission()
  if (permission !== 'denied') return null

  return (
    <div className="flex items-center gap-2 text-xs opacity-50">
      <BellOff size={14} />
      <span>Notificaciones bloqueadas — activalas desde la configuración del navegador</span>
    </div>
  )
}
