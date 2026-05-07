// routes.tsx — application routing
// Stub routes for F1 foundation; will be fully wired in T22 with all feature pages.
// BrowserRouter is provided by providers.tsx — do NOT add it here.
import { Routes, Route, Navigate } from 'react-router-dom'

/**
 * AppRoutes — renders the route tree.
 * This stub renders a redirect from / to /welcome as placeholder.
 * Full routing is implemented in T22.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
