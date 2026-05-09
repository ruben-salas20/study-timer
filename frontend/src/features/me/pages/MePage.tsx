// MePage.tsx — "Yo" hub screen at /me (and the BottomNav "Yo" tab entry)
// Shows avatar, displayName, friendCode, then nav cards for Stats/Profile/Settings.
import { Link, useNavigate } from 'react-router-dom'
import { BarChart2, User, Settings, BookOpen, Mail } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { BottomNav } from '@/shared/ui/BottomNav'
import { EnableNotificationsCTA } from '@/features/pwa/components/EnableNotificationsCTA'
import { Avatar } from '@/features/avatar/components/Avatar'

const APP_VERSION = __APP_VERSION__
const REPORT_EMAIL = 'rubensalas0907@gmail.com'

interface NavCard {
  to: string
  icon: React.ReactNode
  label: string
  description: string
}

const NAV_CARDS: NavCard[] = [
  {
    to: '/stats',
    icon: <BarChart2 size={22} />,
    label: 'Estadísticas',
    description: 'Racha, tiempo total y más',
  },
  {
    to: '/subjects',
    icon: <BookOpen size={22} />,
    label: 'Materias',
    description: 'Etiqueta tus sesiones de estudio',
  },
  {
    to: '/profile',
    icon: <User size={22} />,
    label: 'Perfil',
    description: 'Nombre, objetivo, contraseña',
  },
  {
    to: '/settings',
    icon: <Settings size={22} />,
    label: 'Ajustes',
    description: 'Tema, acento, zona horaria',
  },
]

export function MePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const displayName = (user?.displayName as string | undefined) ?? ''
  const friendCode = (user?.friendCode as string | undefined) ?? '------'
  const email = (user?.email as string | undefined) ?? ''

  const reportHref = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(
    `Cuyodoro v${APP_VERSION} - Reporte`
  )}&body=${encodeURIComponent(`\n\n---\nUsuario: ${email}\nVersión: ${APP_VERSION}`)}`

  async function handleLogout() {
    await logout()
    navigate('/welcome')
  }

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-bold">Yo</h1>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-6">

        {/* ── Avatar + identity ────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 py-4">
          <Avatar
            userId={(user?.id as string | undefined) ?? ''}
            avatar={user?.avatar as string | undefined}
            avatarPreset={user?.avatarPreset as string | undefined}
            displayName={displayName || '?'}
            className="w-20 h-20"
            textClassName="text-3xl"
          />
          <p className="text-xl font-bold">{displayName}</p>
          <p className="text-sm font-mono opacity-50">{friendCode}</p>
        </div>

        {/* ── Nav cards (incl. notificaciones + reportar) ─────────── */}
        <div className="flex flex-col gap-3">
          {NAV_CARDS.map(({ to, icon, label, description }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-4 rounded-xl border border-current/15 px-4 py-3 hover:border-(--color-primary)/40 transition-colors"
            >
              <span className="text-(--color-primary)">{icon}</span>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs opacity-50">{description}</span>
              </div>
              <span className="ml-auto opacity-30 text-sm">→</span>
            </Link>
          ))}

          <EnableNotificationsCTA />

          <a
            href={reportHref}
            className="flex items-center gap-4 rounded-xl border border-current/15 px-4 py-3 hover:border-(--color-primary)/40 transition-colors"
            aria-label="Reportar un problema por email"
          >
            <span className="text-(--color-primary)"><Mail size={20} /></span>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Reportar errores</span>
              <span className="text-xs opacity-50">Cuéntame qué falló o qué te gustaría</span>
            </div>
            <span className="ml-auto opacity-30 text-sm">→</span>
          </a>
        </div>

        {/* ── Versión + créditos ──────────────────────────────────── */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-[11px] font-mono opacity-50">v{APP_VERSION}</span>
          <span className="text-[11px] opacity-50">
            Por Ruben Salas (con apoyo de Claude{' '}
            <span aria-label="corazón naranja" role="img">🧡</span>).
          </span>
        </div>

        {/* ── Cerrar sesión ────────────────────────────────────────── */}
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
