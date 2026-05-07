// schemas.ts — Zod validation schemas for profile editing
import { z } from 'zod'

/**
 * displayNameSchema — validates a visible display name.
 * Minimum 2 characters, maximum 100.
 */
export const displayNameSchema = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100, 'El nombre no puede superar 100 caracteres')

export type DisplayNameInput = z.infer<typeof displayNameSchema>

/**
 * weeklyGoalSchema — validates weekly study goal in minutes.
 * Range: 30 min (minimum meaningful goal) to 4200 min (70 hours).
 */
export const weeklyGoalSchema = z
  .number()
  .int('El objetivo debe ser un número entero de minutos')
  .min(30, 'El objetivo mínimo es 30 minutos')
  .max(4200, 'El objetivo máximo es 4200 minutos')

export type WeeklyGoalInput = z.infer<typeof weeklyGoalSchema>

/**
 * passwordChangeSchema — validates a password change form.
 * currentPassword: required (non-empty)
 * newPassword: minimum 8 characters
 * confirmPassword: must match newPassword
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
