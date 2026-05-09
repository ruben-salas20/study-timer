// MePage.tsx — "Yo" hub screen at /me (and the BottomNav "Yo" tab entry)
// Shows avatar, displayName, friendCode, then nav cards for Stats/Profile/Settings.
// F6: adds EnableNotificationsCTA + install app hint.
import { Link, useNavigate } from 'react-router-dom'
import { BarChart2, User, Settings, Download, BookOpen } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { BottomNav } from '@/shared/ui/BottomNav'
import { EnableNotificationsCTA } from '@/features/pwa/components/EnableNotificationsCTA'

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

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
          <div className="w-20 h-20 rounded-full bg-(--color-primary) flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {getInitials(displayName || '?')}
            </span>
          </div>
          <p className="text-xl font-bold">{displayName}</p>
          <p className="text-sm font-mono opacity-50">{friendCode}</p>
        </div>

        {/* ── Nav cards ─────────────────────────────────────────────── */}
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
        </div>

        {/* ── Notificaciones CTA (F6) ─────────────────────────────── */}
        <EnableNotificationsCTA />

        {/* ── Instalar app (F6) ───────────────────────────────────── */}
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl border border-current/15 px-4 py-3 hover:border-(--color-primary)/40 transition-colors"
          aria-label="Instalar aplicación"
        >
          <span className="text-(--color-primary)"><Download size={20} /></span>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Instalar app</span>
            <span className="text-xs opacity-50">Accedé desde tu pantalla de inicio</span>
          </div>
          <span className="ml-auto opacity-30 text-sm">→</span>
        </Link>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="w-full py-3 rounded-xl border border-red-500/40 text-red-500 text-sm font-semibold hover:bg-red-500/10 transition-colors mt-4"
        >
          Cerrar sesión
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
