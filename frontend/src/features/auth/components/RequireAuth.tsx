// RequireAuth.tsx — Route guard component
// Redirects unauthenticated users to /welcome.
// Shows a loading spinner while auth state is resolving.
// Renders children when the user is authenticated.
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * Wrap a route element with <RequireAuth> to protect it.
 *
 * Behavior:
 *   - isLoading → show spinner (avoids flash-redirect on page load)
 *   - !isAuthenticated → Navigate to /welcome (replace)
 *   - isAuthenticated → render children
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"
          aria-label="Cargando..."
          role="status"
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />
  }

  return <>{children}</>
}
