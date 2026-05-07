// schemas.ts — Zod validation schemas for auth forms
// Shared between form validation (React Hook Form) and API calls.
import { z } from 'zod'

/**
 * Schema for the registration form.
 * displayName: at least 2 characters (visible to friends)
 * email: valid email format
 * password: at least 8 characters
 */
export const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres'),
  email: z
    .string()
    .email('Ingresá un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Schema for the login form.
 * email: valid email format
 * password: required (no length constraint — could be any existing password)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Ingresá un email válido'),
  password: z
    .string()
    .min(1, 'Ingresá tu contraseña'),
})

export type LoginInput = z.infer<typeof loginSchema>
