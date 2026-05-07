// aggregators.ts — Pure functions for challenge state computation
//
// All functions are pure: same inputs → same outputs, no side effects.
// This makes them trivially testable and composable in any UI layer.
//
// group_streak note: streakDays is NOT stored server-side (F4 decision).
// computeGroupStreakState derives streak from session history, keyed by userId
// and indexed by UTC day (YYYY-MM-DD). A day counts toward the streak if
// ALL participants have at least one session on that day.
//
// Reference: ARCHITECTURE.md §4, F4 scope.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Participant {
  id: string
  userId: string
  progressSec: number
  streakDays: number
  joinedAt: string
}

export interface Challenge {
  id: string
  type: 'race' | 'weekly_goal' | 'duel' | 'group_streak'
  title: string
  startsAt: string
  endsAt: string
  targetSec?: number
  targetDays?: number
  status: 'pending' | 'active' | 'completed' | 'cancelled'
}

// ── computeRaceLeader ─────────────────────────────────────────────────────────

export interface RaceLeaderResult {
  winnerId: string | null
  isFinished: boolean
  leaderProgressSec: number
}

/**
 * computeRaceLeader — finds the participant with the highest progressSec.
 * If targetSec is provided, marks isFinished=true when leader meets or exceeds it.
 */
export function computeRaceLeader(
  participants: Participant[],
  targetSec?: number
): RaceLeaderResult {
  if (participants.length === 0) {
    return { winnerId: null, isFinished: false, leaderProgressSec: 0 }
  }

  const leader = participants.reduce((best, current) =>
    current.progressSec > best.progressSec ? current : best
  )

  const isFinished = targetSec !== undefined
    ? leader.progressSec >= targetSec
    : false

  return {
    winnerId: leader.userId,
    isFinished,
    leaderProgressSec: leader.progressSec,
  }
}

// ── computeWeeklyGoalState ────────────────────────────────────────────────────

export interface WeeklyGoalParticipantState {
  userId: string
  achieved: boolean
  progressPct: number
}

/**
 * computeWeeklyGoalState — for each participant, determines achievement and
 * progress percentage toward targetSec.
 * progressPct is capped at 100.
 */
export function computeWeeklyGoalState(
  challenge: Challenge,
  participants: Participant[]
): WeeklyGoalParticipantState[] {
  const targetSec = challenge.targetSec ?? 0

  return participants.map((p) => {
    const achieved = p.progressSec >= targetSec
    const progressPct = targetSec > 0
      ? Math.min(100, Math.round((p.progressSec / targetSec) * 100))
      : 0

    return { userId: p.userId, achieved, progressPct }
  })
}

// ── computeDuelState ──────────────────────────────────────────────────────────

export interface DuelState {
  leadingUserId: string
  trailingUserId: string
  leaderProgressSec: number
  gapSec: number
}

/**
 * computeDuelState — determines leader and trailer in a 2-person duel.
 * Assumes participants[0] and participants[1].
 * In a tie, participants[0] is arbitrarily considered the leader.
 */
export function computeDuelState(participants: Participant[]): DuelState {
  const [first, second] = participants

  const leader = first.progressSec >= second.progressSec ? first : second
  const trailer = leader === first ? second : first

  return {
    leadingUserId: leader.userId,
    trailingUserId: trailer.userId,
    leaderProgressSec: leader.progressSec,
    gapSec: leader.progressSec - trailer.progressSec,
  }
}

// ── computeGroupStreakState ───────────────────────────────────────────────────

export interface GroupStreakState {
  currentStreakDays: number
  brokenAt?: string // ISO date string of the day the streak broke
}

/**
 * computeGroupStreakState — derives streak from session history.
 *
 * sessionsByUser: Record<userId, string[]> where each string is "YYYY-MM-DD" UTC.
 *
 * A day counts toward the streak if ALL participants have at least one session
 * on that day. The streak is the count of qualifying days.
 *
 * For F4, we count ALL common days (not necessarily consecutive from today).
 * This keeps the logic simple and verifiable without real-time date tracking.
 */
export function computeGroupStreakState(
  _challenge: Challenge,
  sessionsByUser: Record<string, string[]>
): GroupStreakState {
  const userIds = Object.keys(sessionsByUser)

  if (userIds.length === 0) {
    return { currentStreakDays: 0 }
  }

  // Collect all unique days across all users
  const allDays = new Set<string>()
  for (const days of Object.values(sessionsByUser)) {
    for (const day of days) {
      allDays.add(day)
    }
  }

  // A day qualifies if every user has at least one session that day
  let streakCount = 0
  for (const day of allDays) {
    const allParticipantsStudied = userIds.every((uid) =>
      (sessionsByUser[uid] ?? []).includes(day)
    )
    if (allParticipantsStudied) {
      streakCount++
    }
  }

  return { currentStreakDays: streakCount }
}
