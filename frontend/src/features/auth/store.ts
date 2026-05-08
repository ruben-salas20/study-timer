// store.ts — Zustand auth store
// Provides synchronous access to auth state for the timer feature and other
// non-React contexts (e.g., service workers, utility functions).
// Stays in sync with PocketBase authStore via onChange subscription.
import { create } from 'zustand'
import pb from '@/shared/pb'

interface AuthUser {
  id: string
  email: string
  displayName?: string
  friendCode?: string
  weeklyGoalMinutes?: number
  timezone?: string
  theme?: 'auto' | 'light' | 'dark'
  accentColor?: 'sage' | 'blue' | 'warm' | 'mono' | 'rose'
  [key: string]: unknown
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initialize from current PocketBase authStore model
  user: pb.authStore.model as AuthUser | null,
  isAuthenticated: pb.authStore.isValid,

  setUser: (user) => set({ user, isAuthenticated: user != null }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}))

// Subscribe to PocketBase authStore changes to keep the Zustand store in sync.
// This subscription is module-level (singleton) — runs once when the module loads.
pb.authStore.onChange((_token, model) => {
  const store = useAuthStore.getState()
  if (model) {
    store.setUser(model as AuthUser)
  } else {
    store.clearUser()
  }
})
