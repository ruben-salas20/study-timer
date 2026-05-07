// T17 — RED tests for useOnboardingFlow hook
// Tests fail until useOnboardingFlow.ts (T18) is implemented.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createWrapper } from '@/shared/test/createWrapper'

// Mock useAuth to provide current user
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Mock PocketBase singleton
vi.mock('@/shared/pb', () => ({
  default: {
    collection: vi.fn().mockReturnValue({
      update: vi.fn().mockResolvedValue({}),
    }),
    authStore: {
      model: null,
      isValid: false,
      clear: vi.fn(),
      onChange: vi.fn(() => () => {}),
    },
  },
}))

describe('useOnboardingFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts at "goal" step', async () => {
    const { useAuth } = await import('@/features/auth/hooks/useAuth')
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

    const { useOnboardingFlow } = await import('./useOnboardingFlow')
    const { result } = renderHook(() => useOnboardingFlow(), { wrapper: createWrapper() })

    expect(result.current.step).toBe('goal')
  })

  it('transitions from goal to invite step', async () => {
    const { useAuth } = await import('@/features/auth/hooks/useAuth')
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

    const { useOnboardingFlow } = await import('./useOnboardingFlow')
    const { result } = renderHook(() => useOnboardingFlow(), { wrapper: createWrapper() })

    act(() => {
      result.current.goToInvite(600)
    })

    expect(result.current.step).toBe('invite')
    expect(result.current.weeklyGoalMinutes).toBe(600)
  })

  it('rejects weeklyGoalMinutes below 30', async () => {
    const { useAuth } = await import('@/features/auth/hooks/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123' } as ReturnType<typeof useAuth>['user'],
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

    const { useOnboardingFlow } = await import('./useOnboardingFlow')
    const { result } = renderHook(() => useOnboardingFlow(), { wrapper: createWrapper() })

    act(() => {
      result.current.goToInvite(10)
    })

    // Should NOT transition — validation error
    expect(result.current.step).toBe('goal')
    expect(result.current.goalError).toBeTruthy()
  })

  it('rejects weeklyGoalMinutes above 4200', async () => {
    const { useAuth } = await import('@/features/auth/hooks/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123' } as ReturnType<typeof useAuth>['user'],
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

    const { useOnboardingFlow } = await import('./useOnboardingFlow')
    const { result } = renderHook(() => useOnboardingFlow(), { wrapper: createWrapper() })

    act(() => {
      result.current.goToInvite(5000)
    })

    expect(result.current.step).toBe('goal')
    expect(result.current.goalError).toBeTruthy()
  })

  it('completeOnboarding calls pb.collection("users").update() with weeklyGoalMinutes', async () => {
    const { useAuth } = await import('@/features/auth/hooks/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123' } as ReturnType<typeof useAuth>['user'],
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

    const pb = (await import('@/shared/pb')).default
    const mockUpdate = vi.fn().mockResolvedValue({})
    vi.mocked(pb.collection).mockReturnValue({
      update: mockUpdate,
    } as ReturnType<typeof pb.collection>)

    const { useOnboardingFlow } = await import('./useOnboardingFlow')
    const { result } = renderHook(() => useOnboardingFlow(), { wrapper: createWrapper() })

    // Set goal first
    act(() => {
      result.current.goToInvite(900)
    })

    // Complete
    await act(async () => {
      await result.current.completeOnboarding()
    })

    expect(pb.collection).toHaveBeenCalledWith('users')
    expect(mockUpdate).toHaveBeenCalledWith('user-123', { weeklyGoalMinutes: 900 })
  })
})
