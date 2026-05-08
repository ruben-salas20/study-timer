// providers.tsx — global provider composition
// Wraps the app with:
//   - BrowserRouter (React Router)
//   - QueryClientProvider (TanStack Query)
//   - ThemeEffect: reads user.theme + user.accentColor → sets data-theme/data-accent on <html>
//   - InstallPrompt: PWA install banner (F6) — renders conditionally at app shell level
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import pb from '@/shared/pb'
import { InstallPrompt } from '@/features/pwa/components/InstallPrompt'

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
    const darkMq = window.matchMedia('(prefers-color-scheme: dark)')

    function resolveTheme(userPref: string | undefined): 'light' | 'dark' {
      const pref = userPref ?? 'auto'
      if (pref === 'auto') return darkMq.matches ? 'dark' : 'light'
      return pref === 'dark' ? 'dark' : 'light'
    }

    function applyTheme() {
      const model = pb.authStore.model as Record<string, unknown> | null
      const userPref = model?.theme as string | undefined
      const accent = (model?.accentColor as string | undefined) ?? 'sage'

      const resolved = resolveTheme(userPref)

      // Always set an explicit value so CSS [data-theme="dark"] selectors apply.
      // Previously we set "" for auto which left CSS in default light mode
      // even when the OS was in dark mode.
      document.documentElement.dataset.theme = resolved
      document.documentElement.dataset.accent = accent

      // Update theme-color meta so mobile status bar follows the theme
      const themeMeta = document.querySelector('meta[name="theme-color"]')
      if (themeMeta) {
        themeMeta.setAttribute('content', resolved === 'dark' ? '#0e0d0b' : '#84a98c')
      }
    }

    applyTheme()

    // Listen to system theme changes — only matters when user pref is "auto"
    const onSystemChange = () => {
      const userPref = (pb.authStore.model as Record<string, unknown> | null)?.theme as
        | string
        | undefined
      if (!userPref || userPref === 'auto') applyTheme()
    }
    darkMq.addEventListener('change', onSystemChange)

    // Update on auth changes (login, logout, profile update)
    const unsubscribe = pb.authStore.onChange(() => {
      applyTheme()
    })

    return () => {
      darkMq.removeEventListener('change', onSystemChange)
      unsubscribe()
    }
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
        {/* InstallPrompt renders a fixed banner when the app is installable */}
        <InstallPrompt />
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
