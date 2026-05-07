// schemas.ts — Zod schemas for the friends feature
// friendCodeSchema: 6-char uppercase alphanumeric, transforms lowercase to uppercase.
import { z } from 'zod'

/**
 * friendCodeSchema — validates a PocketBase friendCode.
 * Accepts exactly 6 characters: A-Z or 0-9.
 * Transform: normalises to uppercase so users can type lowercase.
 */
export const friendCodeSchema = z
  .string()
  .transform((val) => val.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{6}$/, 'El código debe tener exactamente 6 caracteres alfanuméricos'))

export type FriendCode = z.infer<typeof friendCodeSchema>
