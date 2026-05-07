// T09 — RED tests for useAuth hook
// Tests fail until useAuth.ts (T10) is implemented.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@/shared/test/createWrapper'

// Mock the auth API
vi.mock('../api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
}))

// Mock PocketBase singleton
vi.mock('@/shared/pb', () => {
  const listeners: Array<(token: string, model: Record<string, unknown> | null) => void> = []
  return {
    default: {
      authStore: {
        model: null as Record<string, unknown> | null,
        isValid: false,
        clear: vi.fn(),
        onChange: vi.fn((cb: (token: string, model: Record<string, unknown> | null) => void) => {
          listeners.push(cb)
          return () => {
            const idx = listeners.indexOf(cb)
            if (idx !== -1) listeners.splice(idx, 1)
          }
        }),
      },
    },
  }
})

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns unauthenticated initial state (isAuthenticated=false, user=null)', async () => {
    const { getCurrentUser } = await import('../api/auth')
    vi.mocked(getCurrentUser).mockReturnValue(null)

    const { useAuth } = await import('./useAuth')
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('login flow: calls login API and updates state', async () => {
    const { login, getCurrentUser } = await import('../api/auth')
    const fakeUser = { id: '123', email: 'a@b.com', displayName: 'Test' }

    vi.mocked(getCurrentUser).mockReturnValue(null)
    vi.mocked(login).mockResolvedValue({
      record: fakeUser,
      token: 'tok123',
    } as Awaited<ReturnType<typeof login>>)

    const { useAuth } = await import('./useAuth')
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await result.current.login({ email: 'a@b.com', password: 'pass1234' })

    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass1234' })
  })

  it('logout flow: calls logout API', async () => {
    const { logout, getCurrentUser } = await import('../api/auth')
    vi.mocked(getCurrentUser).mockReturnValue(null)
    vi.mocked(logout).mockImplementation(() => {})

    const { useAuth } = await import('./useAuth')
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await result.current.logout()

    expect(logout).toHaveBeenCalled()
  })

  it('exposes register function', async () => {
    const { register, getCurrentUser } = await import('../api/auth')
    vi.mocked(getCurrentUser).mockReturnValue(null)
    vi.mocked(register).mockResolvedValue({ record: { id: '1' }, token: 'tok' } as Awaited<ReturnType<typeof register>>)

    const { useAuth } = await import('./useAuth')
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await result.current.register({
      displayName: 'Test',
      email: 'a@b.com',
      password: 'pass1234',
    })

    expect(register).toHaveBeenCalledWith({
      displayName: 'Test',
      email: 'a@b.com',
      password: 'pass1234',
    })
  })
})
