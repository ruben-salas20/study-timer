// SettingsPage.tsx — F5/F6 implementation
// Theme, accent, timezone, focus mode toggle, notifications (F6), about, logout.
// F8: ConfirmDialog for logout.
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { updatePreferences } from '../api/preferences'
import { BottomNav } from '@/shared/ui/BottomNav'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { usePushPermission } from '@/features/pwa/hooks/usePushPermission'
import { usePushSubscription } from '@/features/pwa/hooks/usePushSubscription'
import { NotificationsDeniedBadge } from '@/features/pwa/components/EnableNotificationsCTA'

type Theme = 'auto' | 'light' | 'dark'
type AccentColor = 'sage' | 'blue' | 'warm' | 'mono'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: 'sage', label: 'Sage' },
  { value: 'blue', label: 'Blue' },
  { value: 'warm', label: 'Warm' },
  { value: 'mono', label: 'Mono' },
]

// Top 20 IANA timezones most commonly used
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

const APP_VERSION = __APP_VERSION__

export function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { permission, request: requestPermission } = usePushPermission()
  const { isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushSubscription()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const currentTheme = (user?.theme as Theme | undefined) ?? 'auto'
  const currentAccent = (user?.accentColor as AccentColor | undefined) ?? 'sage'
  const currentTz = (user?.timezone as string | undefined) ?? 'UTC'

  async function handleThemeChange(theme: Theme) {
    document.documentElement.dataset.theme = theme === 'auto' ? '' : theme
    await updatePreferences({ theme })
  }

  async function handleAccentChange(accent: AccentColor) {
    document.documentElement.dataset.accent = accent
    await updatePreferences({ accentColor: accent })
  }

  async function handleTimezoneChange(tz: string) {
    await updatePreferences({ timezone: tz })
  }

  async function handleLogout() {
    setShowLogoutConfirm(false)
    await logout()
    navigate('/welcome')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-bold">Ajustes</h1>
      </header>

      <main className="flex flex-col flex-1 px-6 pb-24 gap-8 overflow-y-auto">

        {/* ── Tema ─────────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Tema</p>
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleThemeChange(value)}
                className={[
                  'flex-1 py-2 rounded-xl border text-sm font-medium transition-colors',
                  currentTheme === value
                    ? 'bg-(--color-primary) text-white border-(--color-primary)'
                    : 'border-current/20 opacity-60 hover:opacity-80',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Acento ───────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">Acento</p>
          <div className="flex gap-3">
            {ACCENT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleAccentChange(value)}
                className={[
                  'flex-1 py-2 rounded-xl border text-sm font-medium transition-colors capitalize',
                  currentAccent === value
                    ? 'bg-(--color-primary) text-white border-(--color-primary)'
                    : 'border-current/20 opacity-60 hover:opacity-80',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Zona horaria ─────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
            Zona horaria
          </p>
          <select
            defaultValue={currentTz}
            onChange={(e) => void handleTimezoneChange(e.target.value)}
            className="w-full rounded-xl border border-current/20 bg-background px-4 py-2 text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </section>

        {/* ── Modo Focus ────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
            Modo Focus
          </p>
          <div className="flex items-center justify-between rounded-xl border border-current/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Activar Modo Focus</p>
              <p className="text-xs opacity-50 mt-0.5">
                Nota: la PWA no puede bloquear otras apps del dispositivo.
              </p>
            </div>
            <div className="w-10 h-6 rounded-full bg-current/20 relative cursor-not-allowed opacity-40">
              <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-background" />
            </div>
          </div>
        </section>

        {/* ── Notificaciones ───────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
            Notificaciones
          </p>

          {permission === 'denied' ? (
            <NotificationsDeniedBadge />
          ) : (
            <div className="flex flex-col gap-3">
              {/* Permission status */}
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-60">Estado</span>
                <span
                  className={[
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    permission === 'granted'
                      ? 'bg-green-500/15 text-green-600'
                      : 'bg-current/10 opacity-60',
                  ].join(' ')}
                >
                  {permission === 'granted' ? 'Permitido' : 'No configurado'}
                </span>
              </div>

              {/* Subscribe / unsubscribe toggle */}
              {permission === 'granted' ? (
                <div className="flex items-center justify-between rounded-xl border border-current/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Push activado</p>
                    <p className="text-xs opacity-50 mt-0.5">
                      {isSubscribed ? 'Recibirás notificaciones' : 'Sin suscripción activa'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pushLoading}
                    onClick={() => void (isSubscribed ? unsubscribe() : subscribe())}
                    className={[
                      'text-xs font-semibold transition-colors',
                      isSubscribed ? 'text-red-500' : 'text-(--color-primary)',
                      pushLoading ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    {pushLoading ? '...' : isSubscribed ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestPermission()}
                  className="w-full py-2.5 rounded-xl border border-(--color-primary)/40 text-(--color-primary) text-sm font-semibold hover:bg-(--color-primary)/10 transition-colors"
                >
                  Permitir notificaciones
                </button>
              )}

              {/* Test notification — only when subscribed */}
              {permission === 'granted' && isSubscribed && (
                <button
                  type="button"
                  onClick={() => {
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.ready
                        .then((reg) =>
                          reg.showNotification('Study Timer — prueba', {
                            body: 'Las notificaciones funcionan correctamente',
                            icon: '/icons/icon-192x192.png',
                            tag: 'test-notification',
                          })
                        )
                        .catch(console.error)
                    }
                  }}
                  className="text-xs text-(--color-primary) opacity-70 hover:opacity-100 transition-opacity text-left"
                >
                  Enviar notificación de prueba →
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Acerca de ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
            Acerca de
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between py-2 border-b border-current/10">
              <span className="opacity-60">Versión</span>
              <span className="font-mono">{APP_VERSION}</span>
            </div>
            <a
              href={`mailto:${user?.email ?? 'soporte@studytimer.app'}?subject=Reporte%20de%20problema%20Study%20Timer%20v${APP_VERSION}`}
              className="py-2 text-(--color-primary) font-medium"
            >
              Reportar problema →
            </a>
          </div>
        </section>

        {/* ── Cerrar sesión ─────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3 rounded-xl border border-red-500/40 text-red-500 text-sm font-semibold hover:bg-red-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Cerrar sesión
        </button>
      </main>

      {/* Confirm logout dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="¿Cerrar sesión?"
        description="Se cerrará tu sesión en este dispositivo. Podrás volver a iniciar sesión en cualquier momento."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleLogout()}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <BottomNav />
    </div>
  )
}
