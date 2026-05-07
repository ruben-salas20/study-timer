// HomePage.tsx — T23
// Placeholder home screen for authenticated users.
// Shows greeting with displayName + friendCode + logout button.
// Layout ref: hifi-screens-1.jsx HFHome
// RequireAuth is applied at the router level — not needed here.
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/welcome')
  }

  const greeting = user?.displayName
    ? `Hola, ${String(user.displayName).split(' ')[0]}`
    : 'Bienvenido'

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50 mb-0.5">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </p>
          <h1 className="text-2xl font-bold">{greeting}</h1>
        </div>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full bg-(--color-primary) text-white font-semibold text-lg"
          aria-label="Avatar"
        >
          {user?.displayName ? String(user.displayName)[0].toUpperCase() : '?'}
        </div>
      </header>

      <main className="flex flex-col flex-1 px-6 pt-4 pb-10 gap-4" role="main">
        {/* Friend code badge */}
        {user?.friendCode && (
          <div className="rounded-2xl bg-(--color-primary)/10 px-5 py-4">
            <p className="text-xs uppercase tracking-widest opacity-60 mb-1">
              Tu código de amigo
            </p>
            <code className="font-mono text-xl font-bold tracking-[0.2em]">
              {String(user.friendCode)}
            </code>
          </div>
        )}

        {/* Placeholder content */}
        <div className="rounded-2xl border border-current/10 px-5 py-6 text-center opacity-50">
          <p className="text-sm">El timer llega en F2 ⏱</p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 px-6 rounded-xl font-medium text-base border border-current/30 opacity-70"
        >
          Cerrar sesión
        </button>
      </main>
    </div>
  )
}
