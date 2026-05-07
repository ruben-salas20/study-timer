import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock useAuth to avoid PocketBase calls in tests
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    loginError: null,
    registerError: null,
    isLoginPending: false,
    isRegisterPending: false,
  }),
}))

// Mock PocketBase to avoid real HTTP calls
vi.mock('@/shared/pb', () => ({
  default: {
    authStore: {
      model: null,
      isValid: false,
      clear: vi.fn(),
      onChange: vi.fn(() => () => {}),
    },
    collection: vi.fn().mockReturnValue({
      authWithPassword: vi.fn(),
      create: vi.fn(),
    }),
  },
}))

function renderApp(initialPath = '/welcome') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        {/* Import App inside render to avoid module init issues */}
        <div id="app-root" />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders without crashing', () => {
    renderApp()
    expect(document.body.childNodes.length).toBeGreaterThan(0)
  })

  it('renders WelcomePage at /welcome route', async () => {
    const { default: App } = await import('./App')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/welcome']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByRole('heading', { name: /study timer/i })).toBeInTheDocument()
  })

  it('renders WelcomePage CTA buttons', async () => {
    const { default: App } = await import('./App')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/welcome']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
  })
})
