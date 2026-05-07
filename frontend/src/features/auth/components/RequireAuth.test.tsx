// T12 — RED tests for RequireAuth component
// Tests fail until RequireAuth.tsx (T13) is implemented.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Mock useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('RequireAuth', () => {
  it('redirects to /welcome when not authenticated', async () => {
    const { useAuth } = await import('../hooks/useAuth')
    vi.mocked(useAuth).mockReturnValue({
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
    })

    const { RequireAuth } = await import('./RequireAuth')

    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <RequireAuth>
                <div>Protected content</div>
              </RequireAuth>
            }
          />
          <Route path="/welcome" element={<div>Welcome page</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Should redirect to /welcome — not render protected content
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.getByText('Welcome page')).toBeInTheDocument()
  })

  it('renders children when authenticated', async () => {
    const { useAuth } = await import('../hooks/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123', email: 'a@b.com', displayName: 'Test' } as ReturnType<typeof useAuth>['user'],
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      loginError: null,
      registerError: null,
      isLoginPending: false,
      isRegisterPending: false,
    })

    const { RequireAuth } = await import('./RequireAuth')

    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <RequireAuth>
                <div>Protected content</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('renders loading state when isLoading is true', async () => {
    const { useAuth } = await import('../hooks/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      loginError: null,
      registerError: null,
      isLoginPending: false,
      isRegisterPending: false,
    })

    const { RequireAuth } = await import('./RequireAuth')

    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route
            path="/home"
            element={
              <RequireAuth>
                <div>Protected content</div>
              </RequireAuth>
            }
          />
          <Route path="/welcome" element={<div>Welcome page</div>} />
        </Routes>
      </MemoryRouter>
    )

    // During loading: neither welcome nor protected content
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.queryByText('Welcome page')).not.toBeInTheDocument()
  })
})
