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
  /** Subject id, if the session was tagged. Empty/undefined means "no subject". */
  subject?: string
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

// ── groupSessionsBySubject ────────────────────────────────────────────────────

/**
 * groupSessionsBySubject — sums durationSec per subject id.
 * Sessions without a subject accumulate under the empty-string key "".
 */
export function groupSessionsBySubject(sessions: StatsSession[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const session of sessions) {
    const key = session.subject || ''
    result.set(key, (result.get(key) ?? 0) + session.durationSec)
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
export function computeStreakDays(
  sessions: StatsSession[],
  tz: string,
  frozenDays?: Iterable<string>
): number {
  if (sessions.length === 0 && !frozenDays) return 0

  // Collect unique day keys from sessions. Frozen days (rescued by a freeze)
  // count as "in-streak" days even though no session exists for them.
  const daySet = new Set<string>()
  for (const session of sessions) {
    daySet.add(toLocalDateKey(session.startedAt, tz))
  }
  if (frozenDays) {
    for (const d of frozenDays) daySet.add(d)
  }

  if (daySet.size === 0) return 0

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

// ── computeWeekDelta ──────────────────────────────────────────────────────────

export interface WeekDelta {
  thisWeekSec: number
  lastWeekSec: number
  /** Percent change vs the previous week. Capped at +999/-100 for display.
   *  `null` when the previous week had zero activity (delta undefined). */
  deltaPct: number | null
}

/**
 * computeWeekDelta — current week's total + previous week's total + delta %.
 * Used in /stats to show "esta semana vs anterior". The week starts on Monday.
 */
export function computeWeekDelta(
  sessions: StatsSession[],
  tz: string,
  referenceDate?: Date
): WeekDelta {
  const now = referenceDate ?? new Date()
  const lastWeekRef = new Date(now)
  lastWeekRef.setUTCDate(lastWeekRef.getUTCDate() - 7)

  const thisWeekSec = computeWeekTotal(sessions, tz, 'monday', now)
  const lastWeekSec = computeWeekTotal(sessions, tz, 'monday', lastWeekRef)

  let deltaPct: number | null = null
  if (lastWeekSec > 0) {
    const raw = ((thisWeekSec - lastWeekSec) / lastWeekSec) * 100
    deltaPct = Math.max(-100, Math.min(999, Math.round(raw)))
  }
  return { thisWeekSec, lastWeekSec, deltaPct }
}

// ── computeHourlyDistribution ────────────────────────────────────────────────

/**
 * computeHourlyDistribution — 24-slot histogram of total durationSec grouped
 * by the START hour of each session in the user's local timezone. Index 0 =
 * midnight, index 23 = 11 PM. Used to surface "tu mejor hora del día" in /stats.
 */
export function computeHourlyDistribution(
  sessions: StatsSession[],
  tz: string
): number[] {
  const buckets = new Array(24).fill(0)
  for (const session of sessions) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false,
      }).formatToParts(new Date(session.startedAt))
      const h = parts.find((p) => p.type === 'hour')
      const hour = h ? parseInt(h.value, 10) : NaN
      if (!Number.isNaN(hour) && hour >= 0 && hour < 24) {
        buckets[hour] += session.durationSec
      }
    } catch {
      // fall through — session contributes 0 to histogram
    }
  }
  return buckets
}

/**
 * pickBestHourRange — given a 24-slot histogram, find the contiguous range
 * (length 1 by default) with the highest total. Returns `null` if every bucket
 * is empty. The range wraps around midnight correctly.
 */
export function pickBestHourRange(
  buckets: number[],
  windowHours = 1
): { startHour: number; endHour: number; totalSec: number } | null {
  let max = 0
  let bestStart = -1
  for (let i = 0; i < buckets.length; i++) {
    let sum = 0
    for (let k = 0; k < windowHours; k++) {
      sum += buckets[(i + k) % buckets.length]
    }
    if (sum > max) {
      max = sum
      bestStart = i
    }
  }
  if (bestStart < 0) return null
  return {
    startHour: bestStart,
    endHour: (bestStart + windowHours) % 24,
    totalSec: max,
  }
}
