// auth.ts — Auth API layer
// Wraps PocketBase SDK calls for register, login, logout, getCurrentUser.
// Uses the pb singleton from @/shared/pb.
import pb from '@/shared/pb'
import type { RegisterInput, LoginInput } from '../schemas'

/**
 * Register a new user.
 * 1. Creates the record in the "users" collection
 * 2. Auto-logs in with authWithPassword for immediate session
 */
export async function register(data: RegisterInput) {
  await pb.collection('users').create({
    email: data.email,
    password: data.password,
    passwordConfirm: data.password,
    displayName: data.displayName,
  })

  // Auto-login after registration
  return pb.collection('users').authWithPassword(data.email, data.password)
}

/**
 * Login an existing user with email + password.
 * Returns the auth response (record + token) from PocketBase.
 */
export async function login(data: LoginInput) {
  return pb.collection('users').authWithPassword(data.email, data.password)
}

/**
 * Logout — clears the local auth store (token + model).
 * PocketBase does not have a server-side logout endpoint.
 */
export function logout() {
  pb.authStore.clear()
}

/**
 * Get the currently authenticated user model.
 * Returns null if not authenticated.
 */
export function getCurrentUser() {
  return pb.authStore.model
}
