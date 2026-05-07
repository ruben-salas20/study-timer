// providers.tsx — global provider composition
// Wraps the app with:
//   - BrowserRouter (React Router)
//   - QueryClientProvider (TanStack Query)
// ThemeEffect is added here in T24 (F1 theme wiring)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sensible defaults: retry once, stale after 1 minute
      retry: 1,
      staleTime: 60_000,
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
