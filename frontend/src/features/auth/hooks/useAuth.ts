// useAuth.ts — React hook for authentication state and actions
// Uses TanStack Query for server state + PocketBase authStore.onChange for sync.
// RISK-4: pb.authStore.onChange is unsubscribed in useEffect cleanup.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import pb from '@/shared/pb'
import { login, logout, register, getCurrentUser } from '../api/auth'
import type { LoginInput, RegisterInput } from '../schemas'

const AUTH_QUERY_KEY = ['auth', 'currentUser'] as const

/**
 * useAuth — provides authentication state and mutation functions.
 *
 * Returns:
 *   user           — current PocketBase user model (null if not authenticated)
 *   isAuthenticated — true when a valid auth token is present
 *   isLoading      — true while the initial auth state is being resolved
 *   login(data)    — authenticate with email + password
 *   logout()       — clear auth state
 *   register(data) — create account + auto-login
 */
export function useAuth() {
  const queryClient = useQueryClient()

  // Query for the current user — reads from authStore (sync, no network)
  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    // authStore.model is synchronous — always "fresh"
    staleTime: Infinity,
  })

  // Listen to PocketBase authStore changes (token refresh, logout from another tab)
  // RISK-4: cleanup function from onChange prevents listener leaks in tests
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      // Invalidate query to re-read the updated authStore model
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
    })

    return unsubscribe
  }, [queryClient])

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => login(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => logout(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterInput) => register(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
    },
  })

  return {
    user: user ?? null,
    isAuthenticated: user != null,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  }
}
