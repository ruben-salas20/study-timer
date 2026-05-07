// useWeeklyRanking.test.ts — RED tests for the ranking aggregation logic
// Tests the pure aggregation function that aggregates study sessions per user
// and returns a ranked list with isMe flag.
// Week boundary (ISO week, Monday start) is also tested.
import { describe, it, expect } from 'vitest'
import { aggregateWeeklyRanking, getISOWeekStart } from './useWeeklyRanking'

// ── Fixture helpers ──────────────────────────────────────────────────────────

type Session = {
  id: string
  user: string
  durationSec: number
  startedAt: string
  endedAt: string
}

function makeSession(
  userId: string,
  durationSec: number,
  startedAt: string
): Session {
  return {
    id: `session-${Math.random()}`,
    user: userId,
    durationSec,
    startedAt,
    endedAt: startedAt, // simplified — endedAt not used in aggregation
  }
}

type UserInfo = {
  id: string
  displayName: string
  friendCode: string
  avatarUrl?: string
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('aggregateWeeklyRanking()', () => {
  const me: UserInfo = { id: 'user-me', displayName: 'Yo', friendCode: 'MECODE' }
  const alice: UserInfo = { id: 'user-alice', displayName: 'Alice', friendCode: 'ALICE1' }
  const bob: UserInfo = { id: 'user-bob', displayName: 'Bob', friendCode: 'BOB001' }

  it('returns each user with their total seconds summed', () => {
    const sessions: Session[] = [
      makeSession('user-me', 3600, '2025-01-06T10:00:00Z'),
      makeSession('user-me', 1800, '2025-01-06T12:00:00Z'),
      makeSession('user-alice', 5400, '2025-01-06T09:00:00Z'),
    ]

    const result = aggregateWeeklyRanking(sessions, [me, alice], 'user-me')

    expect(result).toHaveLength(2)
    const meEntry = result.find((r) => r.userId === 'user-me')
    const aliceEntry = result.find((r) => r.userId === 'user-alice')

    expect(meEntry?.totalSec).toBe(5400)   // 3600 + 1800
    expect(aliceEntry?.totalSec).toBe(5400)
  })

  it('sorts results by totalSec descending', () => {
    const sessions: Session[] = [
      makeSession('user-me', 1000, '2025-01-06T10:00:00Z'),
      makeSession('user-alice', 9000, '2025-01-06T09:00:00Z'),
      makeSession('user-bob', 4500, '2025-01-06T08:00:00Z'),
    ]

    const result = aggregateWeeklyRanking(sessions, [me, alice, bob], 'user-me')

    expect(result[0].userId).toBe('user-alice')  // 9000
    expect(result[1].userId).toBe('user-bob')    // 4500
    expect(result[2].userId).toBe('user-me')     // 1000
  })

  it('marks isMe true only for the current user', () => {
    const sessions: Session[] = [
      makeSession('user-me', 3600, '2025-01-06T10:00:00Z'),
      makeSession('user-alice', 3600, '2025-01-06T09:00:00Z'),
    ]

    const result = aggregateWeeklyRanking(sessions, [me, alice], 'user-me')

    const meEntry = result.find((r) => r.userId === 'user-me')
    const aliceEntry = result.find((r) => r.userId === 'user-alice')

    expect(meEntry?.isMe).toBe(true)
    expect(aliceEntry?.isMe).toBe(false)
  })

  it('includes users with zero sessions (totalSec = 0)', () => {
    const sessions: Session[] = [
      makeSession('user-alice', 3600, '2025-01-06T09:00:00Z'),
    ]

    const result = aggregateWeeklyRanking(sessions, [me, alice], 'user-me')

    const meEntry = result.find((r) => r.userId === 'user-me')
    expect(meEntry?.totalSec).toBe(0)
    // Alice with 3600 should come first
    expect(result[0].userId).toBe('user-alice')
  })

  it('includes displayName and friendCode from user info', () => {
    const sessions: Session[] = [
      makeSession('user-me', 1800, '2025-01-06T10:00:00Z'),
    ]

    const result = aggregateWeeklyRanking(sessions, [me], 'user-me')

    expect(result[0].displayName).toBe('Yo')
    expect(result[0].friendCode).toBe('MECODE')
  })
})

describe('getISOWeekStart()', () => {
  it('returns Monday of the current ISO week for a Wednesday', () => {
    // 2025-01-08 is a Wednesday
    const wednesday = new Date('2025-01-08T12:00:00Z')
    const weekStart = getISOWeekStart(wednesday)

    // Week start should be 2025-01-06 (Monday)
    expect(weekStart.getUTCDay()).toBe(1) // 1 = Monday
    expect(weekStart.getUTCFullYear()).toBe(2025)
    expect(weekStart.getUTCMonth()).toBe(0) // January
    expect(weekStart.getUTCDate()).toBe(6)
  })

  it('returns Monday itself when input is a Monday', () => {
    // 2025-01-06 is a Monday
    const monday = new Date('2025-01-06T00:00:00Z')
    const weekStart = getISOWeekStart(monday)

    expect(weekStart.getUTCDate()).toBe(6)
    expect(weekStart.getUTCDay()).toBe(1)
  })

  it('returns the previous Monday when input is a Sunday', () => {
    // 2025-01-12 is a Sunday
    const sunday = new Date('2025-01-12T23:59:59Z')
    const weekStart = getISOWeekStart(sunday)

    // Previous Monday is 2025-01-06
    expect(weekStart.getUTCDate()).toBe(6)
    expect(weekStart.getUTCDay()).toBe(1)
  })
})
