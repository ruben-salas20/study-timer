// aggregators.test.ts — RED → GREEN tests for challenge aggregator pure functions
import { describe, it, expect } from 'vitest'
import {
  computeRaceLeader,
  computeWeeklyGoalState,
  computeDuelState,
  computeGroupStreakState,
} from './aggregators'
import type { Participant, Challenge } from './aggregators'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: 'p1',
    userId: 'u1',
    progressSec: 0,
    streakDays: 0,
    joinedAt: new Date('2024-01-01').toISOString(),
    ...overrides,
  }
}

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1',
    type: 'race',
    title: 'Test Challenge',
    startsAt: new Date('2024-01-01').toISOString(),
    endsAt: new Date('2024-02-01').toISOString(),
    targetSec: 3600,
    targetDays: undefined,
    status: 'active',
    ...overrides,
  }
}

// ── computeRaceLeader ─────────────────────────────────────────────────────────

describe('computeRaceLeader', () => {
  it('returns the participant with the highest progressSec as leader', () => {
    const participants: Participant[] = [
      makeParticipant({ id: 'p1', userId: 'u1', progressSec: 1800 }),
      makeParticipant({ id: 'p2', userId: 'u2', progressSec: 3600 }),
      makeParticipant({ id: 'p3', userId: 'u3', progressSec: 900 }),
    ]

    const result = computeRaceLeader(participants)

    expect(result.winnerId).toBe('u2')
    expect(result.leaderProgressSec).toBe(3600)
  })

  it('marks race as finished when leader meets or exceeds targetSec', () => {
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 7200 }),
      makeParticipant({ userId: 'u2', progressSec: 3600 }),
    ]

    const result = computeRaceLeader(participants, 7200)

    expect(result.isFinished).toBe(true)
    expect(result.winnerId).toBe('u1')
  })

  it('marks race as not finished when no one has reached targetSec', () => {
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 1800 }),
      makeParticipant({ userId: 'u2', progressSec: 1200 }),
    ]

    const result = computeRaceLeader(participants, 7200)

    expect(result.isFinished).toBe(false)
  })

  it('returns first participant when all have equal progress', () => {
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 3600 }),
      makeParticipant({ userId: 'u2', progressSec: 3600 }),
    ]

    const result = computeRaceLeader(participants)

    expect(result.winnerId).toBe('u1')
    expect(result.leaderProgressSec).toBe(3600)
  })
})

// ── computeWeeklyGoalState ────────────────────────────────────────────────────

describe('computeWeeklyGoalState', () => {
  it('marks participant as achieved when progressSec >= targetSec', () => {
    const challenge = makeChallenge({ type: 'weekly_goal', targetSec: 3600 })
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 3600 }),
      makeParticipant({ userId: 'u2', progressSec: 1800 }),
    ]

    const result = computeWeeklyGoalState(challenge, participants)

    const u1State = result.find((s) => s.userId === 'u1')
    const u2State = result.find((s) => s.userId === 'u2')

    expect(u1State?.achieved).toBe(true)
    expect(u2State?.achieved).toBe(false)
  })

  it('calculates correct progressPct for each participant', () => {
    const challenge = makeChallenge({ type: 'weekly_goal', targetSec: 4000 })
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 2000 }),
    ]

    const result = computeWeeklyGoalState(challenge, participants)

    expect(result[0].progressPct).toBe(50)
  })

  it('caps progressPct at 100 when progress exceeds target', () => {
    const challenge = makeChallenge({ type: 'weekly_goal', targetSec: 3600 })
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 7200 }),
    ]

    const result = computeWeeklyGoalState(challenge, participants)

    expect(result[0].progressPct).toBe(100)
    expect(result[0].achieved).toBe(true)
  })

  it('returns empty array for empty participants', () => {
    const challenge = makeChallenge({ type: 'weekly_goal', targetSec: 3600 })

    const result = computeWeeklyGoalState(challenge, [])

    expect(result).toHaveLength(0)
  })
})

// ── computeDuelState ──────────────────────────────────────────────────────────

describe('computeDuelState', () => {
  it('identifies the leading and trailing user in a duel', () => {
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 3600 }),
      makeParticipant({ userId: 'u2', progressSec: 1800 }),
    ]

    const result = computeDuelState(participants)

    expect(result.leadingUserId).toBe('u1')
    expect(result.trailingUserId).toBe('u2')
    expect(result.leaderProgressSec).toBe(3600)
    expect(result.gapSec).toBe(1800)
  })

  it('handles tied duel (gapSec is 0)', () => {
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 1800 }),
      makeParticipant({ userId: 'u2', progressSec: 1800 }),
    ]

    const result = computeDuelState(participants)

    expect(result.gapSec).toBe(0)
    expect(result.leadingUserId).toBe('u1')
    expect(result.trailingUserId).toBe('u2')
  })

  it('returns correct state when second participant is ahead', () => {
    const participants: Participant[] = [
      makeParticipant({ userId: 'u1', progressSec: 500 }),
      makeParticipant({ userId: 'u2', progressSec: 2500 }),
    ]

    const result = computeDuelState(participants)

    expect(result.leadingUserId).toBe('u2')
    expect(result.trailingUserId).toBe('u1')
    expect(result.gapSec).toBe(2000)
  })
})

// ── computeGroupStreakState ───────────────────────────────────────────────────

describe('computeGroupStreakState', () => {
  // Sessions keyed by userId: array of UTC date strings "YYYY-MM-DD"
  it('counts streak days where ALL participants have a session that day', () => {
    const challenge = makeChallenge({ type: 'group_streak', targetDays: 7 })
    const sessionsByUser: Record<string, string[]> = {
      u1: ['2024-01-01', '2024-01-02', '2024-01-03'],
      u2: ['2024-01-01', '2024-01-02'],
      u3: ['2024-01-01', '2024-01-02', '2024-01-03'],
    }

    const result = computeGroupStreakState(challenge, sessionsByUser)

    // Only 2024-01-01 and 2024-01-02 have ALL 3 participants — streak = 2
    expect(result.currentStreakDays).toBe(2)
  })

  it('returns 0 streak when no common days exist', () => {
    const challenge = makeChallenge({ type: 'group_streak', targetDays: 7 })
    const sessionsByUser: Record<string, string[]> = {
      u1: ['2024-01-01'],
      u2: ['2024-01-02'],
    }

    const result = computeGroupStreakState(challenge, sessionsByUser)

    expect(result.currentStreakDays).toBe(0)
  })

  it('returns full streak when all participants studied every day', () => {
    const challenge = makeChallenge({ type: 'group_streak', targetDays: 3 })
    const days = ['2024-01-01', '2024-01-02', '2024-01-03']
    const sessionsByUser: Record<string, string[]> = {
      u1: days,
      u2: days,
    }

    const result = computeGroupStreakState(challenge, sessionsByUser)

    expect(result.currentStreakDays).toBe(3)
  })

  it('handles empty sessionsByUser gracefully', () => {
    const challenge = makeChallenge({ type: 'group_streak', targetDays: 7 })

    const result = computeGroupStreakState(challenge, {})

    expect(result.currentStreakDays).toBe(0)
  })
})
