// providers.tsx — global provider composition
// Wraps the app with:
//   - BrowserRouter (React Router)
//   - QueryClientProvider (TanStack Query)
//   - ThemeEffect: reads user.theme + user.accentColor → sets data-theme/data-accent on <html>
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import pb from '@/shared/pb'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

/**
 * ThemeEffect — subscribes to PocketBase authStore changes and syncs
 * user.theme + user.accentColor to the <html> element's data attributes.
 * Tailwind v4's CSS var overrides pick these up via :root[data-accent="x"] selectors.
 */
function ThemeEffect() {
  useEffect(() => {
    function applyTheme() {
      const model = pb.authStore.model as Record<string, unknown> | null
      const theme = (model?.theme as string | undefined) ?? 'auto'
      const accent = (model?.accentColor as string | undefined) ?? 'sage'

      // data-theme — empty string means "use system preference (auto)"
      document.documentElement.dataset.theme = theme === 'auto' ? '' : theme
      document.documentElement.dataset.accent = accent
    }

    applyTheme()

    // Update on auth changes (login, logout, profile update)
    const unsubscribe = pb.authStore.onChange(() => {
      applyTheme()
    })

    return unsubscribe
  }, [])

  return null
}

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeEffect />
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
