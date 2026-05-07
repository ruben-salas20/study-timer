// aggregators.test.ts — RED → GREEN tests for stats aggregator pure functions
// TDD: tests written BEFORE the implementation exists.
import { describe, it, expect } from 'vitest'
import {
  groupSessionsByDay,
  groupSessionsByMode,
  computeStreakDays,
  computeBestDay,
  computeWeekTotal,
} from './aggregators'

// ── Shared fixtures ───────────────────────────────────────────────────────────

/** Minimal session shape needed by aggregators */
interface SessionFixture {
  startedAt: string
  durationSec: number
  endedAt: string
  mode: 'pomodoro' | 'stopwatch' | 'countdown'
}

function makeSession(overrides: Partial<SessionFixture> & { startedAt: string }): SessionFixture {
  return {
    durationSec: 1800,
    endedAt: new Date(new Date(overrides.startedAt).getTime() + 1800 * 1000).toISOString(),
    mode: 'pomodoro',
    ...overrides,
  }
}

// Use a fixed timezone offset for deterministic tests
const UTC = 'UTC'

// ── groupSessionsByDay ────────────────────────────────────────────────────────

describe('groupSessionsByDay', () => {
  it('groups sessions by their local date key (YYYY-MM-DD)', () => {
    const sessions: SessionFixture[] = [
      makeSession({ startedAt: '2024-01-10T10:00:00Z', durationSec: 3600 }),
      makeSession({ startedAt: '2024-01-10T14:00:00Z', durationSec: 1800 }),
      makeSession({ startedAt: '2024-01-11T09:00:00Z', durationSec: 900 }),
    ]

    const result = groupSessionsByDay(sessions, UTC)

    expect(result.get('2024-01-10')).toBe(5400) // 3600 + 1800
    expect(result.get('2024-01-11')).toBe(900)
  })

  it('returns an empty Map when given no sessions', () => {
    const result = groupSessionsByDay([], UTC)

    expect(result.size).toBe(0)
  })

  it('sums durations correctly when multiple sessions fall on the same day', () => {
    const sessions: SessionFixture[] = [
      makeSession({ startedAt: '2024-03-05T08:00:00Z', durationSec: 600 }),
      makeSession({ startedAt: '2024-03-05T12:00:00Z', durationSec: 600 }),
      makeSession({ startedAt: '2024-03-05T18:00:00Z', durationSec: 600 }),
    ]

    const result = groupSessionsByDay(sessions, UTC)

    expect(result.get('2024-03-05')).toBe(1800)
    expect(result.size).toBe(1)
  })
})

// ── groupSessionsByMode ───────────────────────────────────────────────────────

describe('groupSessionsByMode', () => {
  it('returns totals for each mode', () => {
    const sessions: SessionFixture[] = [
      makeSession({ startedAt: '2024-01-10T08:00:00Z', mode: 'pomodoro', durationSec: 1500 }),
      makeSession({ startedAt: '2024-01-10T09:00:00Z', mode: 'pomodoro', durationSec: 1500 }),
      makeSession({ startedAt: '2024-01-10T10:00:00Z', mode: 'stopwatch', durationSec: 3600 }),
      makeSession({ startedAt: '2024-01-10T11:00:00Z', mode: 'countdown', durationSec: 900 }),
    ]

    const result = groupSessionsByMode(sessions)

    expect(result.pomodoro).toBe(3000)
    expect(result.stopwatch).toBe(3600)
    expect(result.countdown).toBe(900)
  })

  it('returns zeros for all modes when sessions list is empty', () => {
    const result = groupSessionsByMode([])

    expect(result.pomodoro).toBe(0)
    expect(result.stopwatch).toBe(0)
    expect(result.countdown).toBe(0)
  })

  it('handles sessions where only one mode is used', () => {
    const sessions: SessionFixture[] = [
      makeSession({ startedAt: '2024-01-10T08:00:00Z', mode: 'stopwatch', durationSec: 7200 }),
    ]

    const result = groupSessionsByMode(sessions)

    expect(result.stopwatch).toBe(7200)
    expect(result.pomodoro).toBe(0)
    expect(result.countdown).toBe(0)
  })
})

// ── computeStreakDays ─────────────────────────────────────────────────────────

describe('computeStreakDays', () => {
  it('returns 0 when there are no sessions', () => {
    const result = computeStreakDays([], UTC)

    expect(result).toBe(0)
  })

  it('returns 1 when only today has a session', () => {
    const todayStart = new Date()
    todayStart.setUTCHours(10, 0, 0, 0)
    const sessions: SessionFixture[] = [
      makeSession({ startedAt: todayStart.toISOString(), durationSec: 1800 }),
    ]

    const result = computeStreakDays(sessions, UTC)

    expect(result).toBe(1)
  })

  it('returns consecutive day count up to today', () => {
    // Build sessions for today and 2 days before (3 consecutive days)
    const today = new Date()
    today.setUTCHours(10, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setUTCDate(today.getUTCDate() - 1)
    const dayBefore = new Date(today)
    dayBefore.setUTCDate(today.getUTCDate() - 2)

    const sessions: SessionFixture[] = [
      makeSession({ startedAt: today.toISOString(), durationSec: 1800 }),
      makeSession({ startedAt: yesterday.toISOString(), durationSec: 1800 }),
      makeSession({ startedAt: dayBefore.toISOString(), durationSec: 1800 }),
    ]

    const result = computeStreakDays(sessions, UTC)

    expect(result).toBe(3)
  })

  it('breaks streak when there is a gap day', () => {
    // today + 3 days ago (no yesterday → streak breaks)
    const today = new Date()
    today.setUTCHours(10, 0, 0, 0)
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setUTCDate(today.getUTCDate() - 3)

    const sessions: SessionFixture[] = [
      makeSession({ startedAt: today.toISOString(), durationSec: 1800 }),
      makeSession({ startedAt: threeDaysAgo.toISOString(), durationSec: 1800 }),
    ]

    const result = computeStreakDays(sessions, UTC)

    // Only today counts — gap breaks the consecutive chain
    expect(result).toBe(1)
  })
})

// ── computeBestDay ────────────────────────────────────────────────────────────

describe('computeBestDay', () => {
  it('returns the day with the highest total seconds in the last 90 days', () => {
    const sessions: SessionFixture[] = [
      makeSession({ startedAt: '2024-01-10T08:00:00Z', durationSec: 3600 }),
      makeSession({ startedAt: '2024-01-10T14:00:00Z', durationSec: 3600 }),
      makeSession({ startedAt: '2024-01-11T09:00:00Z', durationSec: 1800 }),
    ]

    const result = computeBestDay(sessions, UTC)

    expect(result.date).toBe('2024-01-10')
    expect(result.totalSec).toBe(7200)
  })

  it('returns zeroed result when no sessions are provided', () => {
    const result = computeBestDay([], UTC)

    expect(result.date).toBe('')
    expect(result.totalSec).toBe(0)
  })

  it('returns correct best day when single session exists', () => {
    const sessions: SessionFixture[] = [
      makeSession({ startedAt: '2024-02-14T10:00:00Z', durationSec: 5400 }),
    ]

    const result = computeBestDay(sessions, UTC)

    expect(result.date).toBe('2024-02-14')
    expect(result.totalSec).toBe(5400)
  })
})

// ── computeWeekTotal ──────────────────────────────────────────────────────────

describe('computeWeekTotal', () => {
  it('sums only sessions that fall within the current ISO week', () => {
    // We use a fixed reference point — sessions on different days of the same week
    // Build 3 sessions: Mon, Tue, Wed of the same week
    const monday = new Date('2024-01-08T10:00:00Z') // known Monday
    const tuesday = new Date('2024-01-09T10:00:00Z')
    const nextMonday = new Date('2024-01-15T10:00:00Z') // next week

    // Mock "today" as Thursday 2024-01-11 — we test against a fixed reference date
    const referenceDate = new Date('2024-01-11T12:00:00Z') // Thursday

    const sessions: SessionFixture[] = [
      makeSession({ startedAt: monday.toISOString(), durationSec: 3600 }),
      makeSession({ startedAt: tuesday.toISOString(), durationSec: 1800 }),
      makeSession({ startedAt: nextMonday.toISOString(), durationSec: 900 }),
    ]

    const result = computeWeekTotal(sessions, UTC, 'monday', referenceDate)

    // Only mon + tue = 5400; next monday is outside this week
    expect(result).toBe(5400)
  })

  it('returns 0 when no sessions exist', () => {
    const result = computeWeekTotal([], UTC, 'monday')

    expect(result).toBe(0)
  })
})
