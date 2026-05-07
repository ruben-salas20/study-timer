// SettingsPage.tsx — F5 implementation
// Theme, accent, timezone, focus mode toggle, about section, logout.
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { updatePreferences } from '../api/preferences'
import { BottomNav } from '@/shared/ui/BottomNav'

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
          onClick={() => void handleLogout()}
          className="w-full py-3 rounded-xl border border-red-500/40 text-red-500 text-sm font-semibold hover:bg-red-500/10 transition-colors"
        >
          Cerrar sesión
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
