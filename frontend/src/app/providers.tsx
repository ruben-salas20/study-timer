// providers.tsx — global provider composition
// TanStack Query client wraps the entire tree
// Additional providers (React Router, etc.) will be added in F1
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
      {children}
    </QueryClientProvider>
  )
}
