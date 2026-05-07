// App.tsx — root component
// Renders the route tree. Providers (BrowserRouter, QueryClient) are in providers.tsx / main.tsx.
import { AppRoutes } from './routes'

export default function App() {
  return <AppRoutes />
}
