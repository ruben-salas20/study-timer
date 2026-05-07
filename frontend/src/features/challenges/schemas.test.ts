// schemas.test.ts — RED → GREEN tests for challenge Zod schemas
// Covers all 4 discriminated union types + inviteParticipantsSchema.
import { describe, it, expect } from 'vitest'
import {
  raceSchema,
  weeklyGoalSchema,
  duelSchema,
  groupStreakSchema,
  inviteParticipantsSchema,
} from './schemas'

// ── Shared base helpers ───────────────────────────────────────────────────────

const now = new Date()
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

// ── raceSchema ────────────────────────────────────────────────────────────────

describe('raceSchema', () => {
  const validRace = {
    type: 'race' as const,
    title: 'Carrera de estudio',
    startsAt: tomorrow,
    endsAt: nextMonth,
    targetSec: 3600,
    prizeWinner: 'El ganador paga el café',
  }

  it('accepts a valid race challenge', () => {
    const result = raceSchema.safeParse(validRace)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('race')
      expect(result.data.targetSec).toBe(3600)
    }
  })

  it('accepts race with optional fields (description, prizeLoser)', () => {
    const result = raceSchema.safeParse({
      ...validRace,
      description: 'Una carrera entre amigos',
      prizeLoser: 'El perdedor hace el desayuno',
    })
    expect(result.success).toBe(true)
  })

  it('rejects race with title shorter than 3 chars', () => {
    const result = raceSchema.safeParse({ ...validRace, title: 'AB' })
    expect(result.success).toBe(false)
  })

  it('rejects race with title longer than 80 chars', () => {
    const result = raceSchema.safeParse({ ...validRace, title: 'A'.repeat(81) })
    expect(result.success).toBe(false)
  })

  it('rejects race with targetSec below 3600 (1 hour minimum)', () => {
    const result = raceSchema.safeParse({ ...validRace, targetSec: 59 })
    expect(result.success).toBe(false)
  })

  it('rejects race when endsAt is before startsAt', () => {
    const result = raceSchema.safeParse({
      ...validRace,
      startsAt: nextMonth,
      endsAt: tomorrow,
    })
    expect(result.success).toBe(false)
  })

  it('rejects race without targetSec', () => {
    const { targetSec: _, ...noTarget } = validRace
    const result = raceSchema.safeParse(noTarget)
    expect(result.success).toBe(false)
  })

  it('rejects race without prizeWinner', () => {
    const { prizeWinner: _, ...noWinner } = validRace
    const result = raceSchema.safeParse(noWinner)
    expect(result.success).toBe(false)
  })
})

// ── weeklyGoalSchema ──────────────────────────────────────────────────────────

describe('weeklyGoalSchema', () => {
  const validWeekly = {
    type: 'weekly_goal' as const,
    title: 'Meta semanal',
    startsAt: tomorrow,
    endsAt: nextWeek,
    targetSec: 7200,
    prizeWinner: 'El que más estudia elige la película',
  }

  it('accepts a valid weekly_goal challenge', () => {
    const result = weeklyGoalSchema.safeParse(validWeekly)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('weekly_goal')
      expect(result.data.targetSec).toBe(7200)
    }
  })

  it('rejects weekly_goal with targetSec below 3600', () => {
    const result = weeklyGoalSchema.safeParse({ ...validWeekly, targetSec: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects weekly_goal without prizeWinner', () => {
    const { prizeWinner: _, ...noWinner } = validWeekly
    const result = weeklyGoalSchema.safeParse(noWinner)
    expect(result.success).toBe(false)
  })

  it('rejects weekly_goal when endsAt <= startsAt', () => {
    const result = weeklyGoalSchema.safeParse({
      ...validWeekly,
      startsAt: nextWeek,
      endsAt: tomorrow,
    })
    expect(result.success).toBe(false)
  })
})

// ── duelSchema ────────────────────────────────────────────────────────────────

describe('duelSchema', () => {
  const validDuel = {
    type: 'duel' as const,
    title: 'Duelo épico',
    startsAt: tomorrow,
    endsAt: nextWeek,
    targetSec: 3600,
    prizeWinner: 'El ganador elige el restaurante',
  }

  it('accepts a valid duel challenge', () => {
    const result = duelSchema.safeParse(validDuel)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('duel')
      expect(result.data.targetSec).toBe(3600)
    }
  })

  it('rejects duel with targetSec below 3600', () => {
    const result = duelSchema.safeParse({ ...validDuel, targetSec: 59 })
    expect(result.success).toBe(false)
  })

  it('rejects duel without targetSec', () => {
    const { targetSec: _, ...noDuel } = validDuel
    const result = duelSchema.safeParse(noDuel)
    expect(result.success).toBe(false)
  })

  it('rejects duel with description over 500 chars', () => {
    const result = duelSchema.safeParse({
      ...validDuel,
      description: 'X'.repeat(501),
    })
    expect(result.success).toBe(false)
  })
})

// ── groupStreakSchema ─────────────────────────────────────────────────────────

describe('groupStreakSchema', () => {
  const validGroupStreak = {
    type: 'group_streak' as const,
    title: 'Racha grupal',
    startsAt: tomorrow,
    endsAt: nextMonth,
    targetDays: 7,
    prizeWinner: 'El grupo que mantiene la racha gana',
  }

  it('accepts a valid group_streak challenge', () => {
    const result = groupStreakSchema.safeParse(validGroupStreak)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('group_streak')
      expect(result.data.targetDays).toBe(7)
    }
  })

  it('rejects group_streak with targetDays below 3', () => {
    const result = groupStreakSchema.safeParse({ ...validGroupStreak, targetDays: 2 })
    expect(result.success).toBe(false)
  })

  it('rejects group_streak with targetDays above 30', () => {
    const result = groupStreakSchema.safeParse({ ...validGroupStreak, targetDays: 31 })
    expect(result.success).toBe(false)
  })

  it('rejects group_streak without targetDays', () => {
    const { targetDays: _, ...noTarget } = validGroupStreak
    const result = groupStreakSchema.safeParse(noTarget)
    expect(result.success).toBe(false)
  })

  it('rejects group_streak when endsAt <= startsAt', () => {
    const result = groupStreakSchema.safeParse({
      ...validGroupStreak,
      startsAt: nextMonth,
      endsAt: tomorrow,
    })
    expect(result.success).toBe(false)
  })
})

// ── inviteParticipantsSchema ──────────────────────────────────────────────────

describe('inviteParticipantsSchema', () => {
  it('accepts an array with 1 user id', () => {
    const result = inviteParticipantsSchema.safeParse(['user123'])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
    }
  })

  it('accepts an array with 9 user ids (max for groups)', () => {
    const result = inviteParticipantsSchema.safeParse(Array.from({ length: 9 }, (_, i) => `user${i}`))
    expect(result.success).toBe(true)
  })

  it('rejects an empty array', () => {
    const result = inviteParticipantsSchema.safeParse([])
    expect(result.success).toBe(false)
  })

  it('rejects an array with more than 9 user ids', () => {
    const result = inviteParticipantsSchema.safeParse(Array.from({ length: 10 }, (_, i) => `user${i}`))
    expect(result.success).toBe(false)
  })
})
