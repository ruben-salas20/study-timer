// BottomNav.tsx — Shared bottom navigation bar
// 4 items: Inicio (/home), Amigos (/friends), Retos (/challenges), Yo (/me).
// Active state is determined by the current route path.
// The "Yo" tab activates for /me, /stats, /profile, and /settings.
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Trophy, User } from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  /** Exact match or prefix match for active state */
  matchPrefix?: boolean
  /** Additional path prefixes that also activate this tab */
  alsoMatch?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/home',
    icon: <Home size={22} />,
    label: 'Inicio',
  },
  {
    to: '/friends',
    icon: <Users size={22} />,
    label: 'Amigos',
    matchPrefix: true,
  },
  {
    to: '/challenges',
    icon: <Trophy size={22} />,
    label: 'Retos',
    matchPrefix: true,
  },
  {
    to: '/me',
    icon: <User size={22} />,
    label: 'Yo',
    matchPrefix: true,
    alsoMatch: ['/stats', '/profile', '/settings'],
  },
]

export function BottomNav() {
  const { pathname } = useLocation()

  function isActive(item: NavItem): boolean {
    const prefixMatch = item.matchPrefix
      ? pathname.startsWith(item.to)
      : pathname === item.to

    if (prefixMatch) return true

    return (item.alsoMatch ?? []).some((prefix) => pathname.startsWith(prefix))
  }

  return (
    <nav
      className="shrink-0 flex items-center justify-around border-t border-current/10 bg-background px-2 pb-safe pt-3"
      aria-label="Navegación principal"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={[
              'flex flex-col items-center gap-1 transition-opacity',
              active ? 'text-(--color-primary)' : 'opacity-40 hover:opacity-60',
            ].join(' ')}
            aria-current={active ? 'page' : undefined}
          >
            {item.icon}
            <span className="text-[10px]">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
