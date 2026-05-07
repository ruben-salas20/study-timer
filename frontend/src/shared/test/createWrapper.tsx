// createWrapper.tsx — test utility for hooks that require QueryClient + Router
// Usage: const { result } = renderHook(() => useMyHook(), { wrapper: createWrapper() })
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * Create a fresh QueryClient + MemoryRouter wrapper for each test.
 * Always create a new QueryClient per test to avoid state leakage.
 */
export function createWrapper(initialEntries?: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,     // no retries in tests — fail fast
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries ?? ['/']}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return Wrapper
}
