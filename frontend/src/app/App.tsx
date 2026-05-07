// App.tsx — root component
// Renders the route tree. Providers (BrowserRouter, QueryClient) are in providers.tsx / main.tsx.
// ErrorBoundary wraps the full route tree to catch uncaught render errors.
import { AppRoutes } from './routes'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  )
}
