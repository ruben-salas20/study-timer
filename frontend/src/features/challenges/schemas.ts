// schemas.ts — Zod schemas for the challenges feature
// Covers all 4 challenge types as discriminated unions + inviteParticipantsSchema.
import { z } from 'zod'

// ── Shared base ───────────────────────────────────────────────────────────────

const challengeBaseSchema = z
  .object({
    title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(80, 'Máximo 80 caracteres'),
    description: z.string().max(500, 'Máximo 500 caracteres').optional(),
    startsAt: z.date(),
    endsAt: z.date(),
    prizeWinner: z.string().min(1, 'El premio del ganador es obligatorio').max(200, 'Máximo 200 caracteres'),
    prizeLoser: z.string().max(200, 'Máximo 200 caracteres').optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['endsAt'],
  })

// ── Race ──────────────────────────────────────────────────────────────────────

export const raceSchema = challengeBaseSchema.and(
  z.object({
    type: z.literal('race'),
    targetSec: z
      .number({ required_error: 'El tiempo objetivo es obligatorio' })
      .min(3600, 'El mínimo es 1 hora (3600 segundos)'),
  })
)

export type RaceChallenge = z.infer<typeof raceSchema>

// ── Weekly goal ───────────────────────────────────────────────────────────────

export const weeklyGoalSchema = challengeBaseSchema.and(
  z.object({
    type: z.literal('weekly_goal'),
    targetSec: z
      .number({ required_error: 'El tiempo objetivo es obligatorio' })
      .min(3600, 'El mínimo es 1 hora (3600 segundos)'),
  })
)

export type WeeklyGoalChallenge = z.infer<typeof weeklyGoalSchema>

// ── Duel ──────────────────────────────────────────────────────────────────────

export const duelSchema = challengeBaseSchema.and(
  z.object({
    type: z.literal('duel'),
    targetSec: z
      .number({ required_error: 'El tiempo objetivo es obligatorio' })
      .min(3600, 'El mínimo es 1 hora (3600 segundos)'),
  })
)

export type DuelChallenge = z.infer<typeof duelSchema>

// ── Group streak ──────────────────────────────────────────────────────────────

/**
 * Number of UTC calendar days covered by [start, end], inclusive of both ends.
 * Mirrors the backend group_streak day-bucketing in on-session-end.pb.js, so the
 * client-side ceiling matches the maximum streak the server can ever count.
 */
function utcDaySpan(start: Date, end: Date): number {
  const ONE_DAY = 24 * 60 * 60 * 1000
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  return Math.floor((endDay - startDay) / ONE_DAY) + 1
}

export const groupStreakSchema = challengeBaseSchema
  .and(
    z.object({
      type: z.literal('group_streak'),
      targetDays: z
        .number({ required_error: 'El número de días es obligatorio' })
        .int()
        .min(3, 'El mínimo es 3 días')
        .max(30, 'El máximo es 30 días'),
    })
  )
  // A streak goal longer than the challenge window is unreachable by design —
  // the backend can count at most one valid day per calendar day in [start, end].
  .refine((data) => data.targetDays <= utcDaySpan(data.startsAt, data.endsAt), {
    message: 'La meta de días no puede superar la duración del reto',
    path: ['targetDays'],
  })

export type GroupStreakChallenge = z.infer<typeof groupStreakSchema>

// ── Discriminated union ───────────────────────────────────────────────────────

export type AnyChallenge = RaceChallenge | WeeklyGoalChallenge | DuelChallenge | GroupStreakChallenge

// ── Invite participants ───────────────────────────────────────────────────────

export const inviteParticipantsSchema = z
  .array(z.string())
  .min(1, 'Debes invitar al menos a un participante')
  .max(9, 'Máximo 9 participantes adicionales')

export type InviteParticipants = z.infer<typeof inviteParticipantsSchema>
