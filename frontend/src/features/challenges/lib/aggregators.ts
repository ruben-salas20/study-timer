// aggregators.ts — Pure functions for challenge state computation
//
// All functions are pure: same inputs → same outputs, no side effects.
// This makes them trivially testable and composable in any UI layer.
//
// group_streak note: the streak is computed and stored server-side on each
// challenge_participants record (streakDays) by on-session-end.pb.js — that is
// the single source of truth. The UI reads that value; it does not recompute
// the streak from raw session history.

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
