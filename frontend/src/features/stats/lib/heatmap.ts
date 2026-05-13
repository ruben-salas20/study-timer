// heatmap.ts — Pure helpers to build a GitHub-style year heatmap from byDay.
//
// The grid is 53 columns × 7 rows. Each column is a Mon–Sun week, ordered
// oldest-left to newest-right. The right-most column ends on `today`; cells
// past today are `null`. Levels are 0–4 (0 = no activity, 4 = the busiest
// quintile of the user's last 365 days of activity).

import { toLocalDateKey } from './aggregators'

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4

export interface HeatmapCell {
  date: string // YYYY-MM-DD in the user's tz
  sec: number
  level: HeatmapLevel
  isToday: boolean
}

export interface HeatmapColumn {
  /** ISO date (YYYY-MM-DD) of the Monday this column starts on. */
  weekStart: string
  /** 7 cells, Monday at index 0. `null` slots are future days past `today`. */
  days: Array<HeatmapCell | null>
  /** First 3 letters of the month label, set on columns where the Monday
   *  crosses into a new month. Empty string otherwise. */
  monthLabel: string
}

export interface HeatmapData {
  columns: HeatmapColumn[]
  /** Highest single-day total in the window — drives the level thresholds. */
  maxSec: number
}

const WEEKS = 53
const DAYS = 7

/** UTC date helpers — heatmap math is timezone-agnostic at the grid level. */
function utcDay(year: number, month0: number, day: number): Date {
  return new Date(Date.UTC(year, month0, day, 12, 0, 0))
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setUTCDate(d.getUTCDate() + n)
  return next
}

function isoKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Mon=0, Tue=1 ... Sun=6 — matches our top-down row order. */
function mondayBasedDow(d: Date): number {
  const sundayBased = d.getUTCDay() // 0=Sun..6=Sat
  return sundayBased === 0 ? 6 : sundayBased - 1
}

function levelFor(sec: number, maxSec: number): HeatmapLevel {
  if (sec <= 0) return 0
  if (maxSec <= 0) return 1
  const ratio = sec / maxSec
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

/**
 * buildYearHeatmap — assembles the 53×7 grid ending on `today` (local tz).
 *
 * - byDay keys must be local-tz YYYY-MM-DD strings (matches groupSessionsByDay)
 * - today defaults to `new Date()` (overridable for tests)
 */
export function buildYearHeatmap(
  byDay: Map<string, number>,
  tz: string,
  today: Date = new Date()
): HeatmapData {
  // Anchor: Monday of today's week (in tz).
  const todayKeyLocal = toLocalDateKey(today.toISOString(), tz)
  const [ty, tm, td] = todayKeyLocal.split('-').map(Number)
  const todayUtc = utcDay(ty, tm - 1, td)
  const dow = mondayBasedDow(todayUtc)
  const lastMonday = addDays(todayUtc, -dow)
  const firstMonday = addDays(lastMonday, -(WEEKS - 1) * DAYS)

  // First pass: collect all sec values to derive maxSec.
  let maxSec = 0
  for (let w = 0; w < WEEKS; w++) {
    for (let day = 0; day < DAYS; day++) {
      const cellDate = addDays(firstMonday, w * DAYS + day)
      if (cellDate > todayUtc) continue
      const key = isoKey(cellDate)
      const sec = byDay.get(key) ?? 0
      if (sec > maxSec) maxSec = sec
    }
  }

  // Second pass: build columns with levels.
  const columns: HeatmapColumn[] = []
  let prevMonth = -1
  for (let w = 0; w < WEEKS; w++) {
    const weekStart = addDays(firstMonday, w * DAYS)
    const days: Array<HeatmapCell | null> = []
    for (let day = 0; day < DAYS; day++) {
      const cellDate = addDays(weekStart, day)
      if (cellDate > todayUtc) {
        days.push(null)
        continue
      }
      const key = isoKey(cellDate)
      const sec = byDay.get(key) ?? 0
      days.push({
        date: key,
        sec,
        level: levelFor(sec, maxSec),
        isToday: key === todayKeyLocal,
      })
    }

    // Surface a month label whenever this column starts a new month vs the
    // previous column. The very first column always shows its month.
    const startMonth = weekStart.getUTCMonth()
    const monthLabel = (w === 0 || startMonth !== prevMonth) ? MONTH_SHORT[startMonth] : ''
    prevMonth = startMonth

    columns.push({
      weekStart: isoKey(weekStart),
      days,
      monthLabel,
    })
  }

  return { columns, maxSec }
}

/** Format minutes total for tooltips. */
export function formatSecForTooltip(sec: number): string {
  if (sec <= 0) return 'Sin actividad'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

/** Pretty-print a YYYY-MM-DD key for tooltips. */
export function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}
