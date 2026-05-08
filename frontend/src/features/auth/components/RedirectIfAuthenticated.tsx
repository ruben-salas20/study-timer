// RedirectIfAuthenticated.tsx — Inverse route guard for public pages.
// If the user already has a valid session, send them straight to /home
// instead of forcing them through welcome/login/register again. Without
// this, the PWA start_url (/) → /welcome chain would re-prompt login
// even though pb.authStore already had a valid token in localStorage.
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface RedirectIfAuthenticatedProps {
  children: ReactNode
}

export function RedirectIfAuthenticated({ children }: RedirectIfAuthenticatedProps) {
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

  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
