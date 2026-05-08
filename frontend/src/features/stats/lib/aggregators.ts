// aggregators.ts — Pure functions for stats computation
//
// All functions are pure: same inputs → same outputs, no side effects.
// Testable without mocks, composable in any UI layer.
//
// Session shape: any object with at least { startedAt, durationSec, mode }
// The `startedAt` field is an ISO 8601 string (UTC).
//
// Reference: ARCHITECTURE.md §4, F5 scope.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatsSession {
  startedAt: string
  durationSec: number
  endedAt: string
  mode: 'pomodoro' | 'stopwatch' | 'countdown'
}

export interface ModeBreakdown {
  pomodoro: number
  stopwatch: number
  countdown: number
}

export interface BestDayResult {
  date: string    // YYYY-MM-DD
  totalSec: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * toLocalDateKey — converts a UTC ISO string to "YYYY-MM-DD" in the given
 * IANA timezone. Falls back to UTC slicing when Intl is unavailable.
 */
function toLocalDateKey(isoString: string, tz: string): string {
  try {
    const date = new Date(isoString)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)

    const year = parts.find((p) => p.type === 'year')?.value ?? ''
    const month = parts.find((p) => p.type === 'month')?.value ?? ''
    const day = parts.find((p) => p.type === 'day')?.value ?? ''

    return `${year}-${month}-${day}`
  } catch {
    // Fallback: slice the ISO string — correct only for UTC
    return isoString.slice(0, 10)
  }
}

/**
 * todayKey — returns today's date key (YYYY-MM-DD) in the given timezone.
 */
export function todayKey(tz: string): string {
  return toLocalDateKey(new Date().toISOString(), tz)
}

/** Re-exported helper. Same purpose as in module-private use. */
export { toLocalDateKey }

// ── groupSessionsByDay ────────────────────────────────────────────────────────

/**
 * groupSessionsByDay — aggregates session durations by local calendar day.
 *
 * Returns Map<YYYY-MM-DD, totalSec> for all days present in the sessions array.
 * The tz parameter is an IANA timezone string (e.g. "America/Argentina/Buenos_Aires").
 */
export function groupSessionsByDay(
  sessions: StatsSession[],
  tz: string
): Map<string, number> {
  const result = new Map<string, number>()

  for (const session of sessions) {
    const key = toLocalDateKey(session.startedAt, tz)
    result.set(key, (result.get(key) ?? 0) + session.durationSec)
  }

  return result
}

// ── groupSessionsByMode ───────────────────────────────────────────────────────

/**
 * groupSessionsByMode — sums durationSec for each timer mode.
 * Returns { pomodoro, stopwatch, countdown } with 0 defaults.
 */
export function groupSessionsByMode(sessions: StatsSession[]): ModeBreakdown {
  const result: ModeBreakdown = { pomodoro: 0, stopwatch: 0, countdown: 0 }

  for (const session of sessions) {
    result[session.mode] += session.durationSec
  }

  return result
}

// ── computeStreakDays ─────────────────────────────────────────────────────────

/**
 * computeStreakDays — counts consecutive calendar days (including today) that
 * have at least one completed session, counting backwards from today.
 *
 * A day is "in the streak" if it is today OR if the day immediately after it
 * is also in the streak. Sessions before a gap do NOT count.
 */
export function computeStreakDays(sessions: StatsSession[], tz: string): number {
  if (sessions.length === 0) return 0

  // Collect unique day keys from sessions
  const daySet = new Set<string>()
  for (const session of sessions) {
    daySet.add(toLocalDateKey(session.startedAt, tz))
  }

  const today = todayKey(tz)

  // Walk backwards from today, counting consecutive days in the set
  let streak = 0
  const cursor = new Date()
  // Parse today in UTC to walk backwards day by day
  const [y, m, d] = today.split('-').map(Number)
  cursor.setUTCFullYear(y, m - 1, d)
  cursor.setUTCHours(12, 0, 0, 0) // noon UTC to avoid DST issues

  while (true) {
    const key = cursor.toISOString().slice(0, 10)
    if (!daySet.has(key)) break
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

// ── computeBestDay ────────────────────────────────────────────────────────────

/**
 * computeBestDay — finds the day with the highest total durationSec in the
 * sessions array (no 90-day windowing here — caller passes filtered sessions).
 *
 * Returns { date: '', totalSec: 0 } when sessions is empty.
 */
export function computeBestDay(sessions: StatsSession[], tz: string): BestDayResult {
  if (sessions.length === 0) return { date: '', totalSec: 0 }

  const byDay = groupSessionsByDay(sessions, tz)

  let bestDate = ''
  let bestSec = 0

  for (const [date, sec] of byDay) {
    if (sec > bestSec) {
      bestSec = sec
      bestDate = date
    }
  }

  return { date: bestDate, totalSec: bestSec }
}

// ── computeWeekTotal ──────────────────────────────────────────────────────────

/**
 * computeWeekTotal — sums durationSec for all sessions that fall within the
 * current ISO week (Monday–Sunday by default).
 *
 * weekStart: 'monday' (default) | 'sunday'
 * referenceDate: optional override for "today" — used in tests for determinism.
 */
export function computeWeekTotal(
  sessions: StatsSession[],
  tz: string,
  weekStart: 'monday' | 'sunday' = 'monday',
  referenceDate?: Date
): number {
  const now = referenceDate ?? new Date()
  const todayStr = toLocalDateKey(now.toISOString(), tz)
  const [y, m, d] = todayStr.split('-').map(Number)

  // Build week-start date in UTC
  const refDay = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const dayOfWeek = refDay.getUTCDay() // 0=Sun, 1=Mon...

  let daysFromWeekStart: number
  if (weekStart === 'monday') {
    daysFromWeekStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  } else {
    daysFromWeekStart = dayOfWeek
  }

  const weekStartDate = new Date(refDay)
  weekStartDate.setUTCDate(refDay.getUTCDate() - daysFromWeekStart)
  weekStartDate.setUTCHours(0, 0, 0, 0)

  const weekEndDate = new Date(weekStartDate)
  weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 7)

  let total = 0
  for (const session of sessions) {
    const sessionDate = new Date(session.startedAt)
    if (sessionDate >= weekStartDate && sessionDate < weekEndDate) {
      total += session.durationSec
    }
  }

  return total
}
