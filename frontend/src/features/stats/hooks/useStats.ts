// useStats.ts — TanStack Query hook for user study statistics.
// Fetches last-90-days completed sessions and derives all stat metrics.
// Realtime: subscribes to study_sessions → invalidates on changes.
//
// React 19 / StrictMode safe: subscription created inside useEffect with cleanup.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import pb from '@/shared/pb'
import {
  groupSessionsByDay,
  groupSessionsByMode,
  groupSessionsBySubject,
  computeStreakDays,
  computeBestDay,
  computeWeekTotal,
  todayKey,
  toLocalDateKey,
  type StatsSession,
} from '../lib/aggregators'

// ── Query key ─────────────────────────────────────────────────────────────────

const STATS_KEYS = {
  all: ['stats'] as const,
  sessions: ['stats', 'sessions'] as const,
}

// ── Data fetcher ──────────────────────────────────────────────────────────────

// 366 days so the year-heatmap always has at least one full year of data even
// across leap years and edge transitions between local-tz and UTC days.
const STATS_WINDOW_DAYS = 366

async function fetchLast90DaysSessions(): Promise<StatsSession[]> {
  const user = pb.authStore.model
  if (!user?.id) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STATS_WINDOW_DAYS)
  const cutoffStr = cutoff.toISOString().replace('T', ' ').substring(0, 19)

  const result = await pb.collection('study_sessions').getList(1, 2000, {
    filter: `user = "${user.id}" && endedAt != "" && startedAt >= "${cutoffStr}"`,
    sort: '-startedAt',
  })

  return result.items.map((item) => ({
    startedAt: item.startedAt as string,
    endedAt: item.endedAt as string,
    durationSec: (item.durationSec as number) ?? 0,
    mode: (item.mode as StatsSession['mode']) ?? 'pomodoro',
    subject: (item.subject as string | undefined) || undefined,
  }))
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function formatMinutes(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function useStats(tz = 'UTC') {
  const queryClient = useQueryClient()
  const myId = pb.authStore.model?.id as string | undefined

  const query = useQuery({
    queryKey: STATS_KEYS.sessions,
    queryFn: fetchLast90DaysSessions,
    staleTime: 5 * 60 * 1000,
    enabled: !!myId && pb.authStore.isValid,
  })

  // Realtime subscription — invalidate on any session change for this user
  useEffect(() => {
    if (!myId) return

    let unsub: (() => void) | undefined

    void pb
      .collection('study_sessions')
      .subscribe('*', () => {
        void queryClient.invalidateQueries({ queryKey: STATS_KEYS.all })
      })
      .then((fn) => { unsub = fn })

    return () => { unsub?.() }
  }, [myId, queryClient])

  const sessions = query.data ?? []

  const derived = useMemo(() => {
    const byDay = groupSessionsByDay(sessions, tz)
    const byMode = groupSessionsByMode(sessions)
    const bySubject = groupSessionsBySubject(sessions)
    const streak = computeStreakDays(sessions, tz)
    const bestDay = computeBestDay(sessions, tz)
    const weekTotal = computeWeekTotal(sessions, tz)
    const allTime = sessions.reduce((s, sess) => s + sess.durationSec, 0)

    // Today sessions — use the same timezone the byDay map was built with.
    // Previously this used UTC slicing (`new Date().toISOString().slice(0, 10)`)
    // which mismatched the local-tz keys in `byDay` whenever the user was in a
    // non-UTC timezone, resulting in todaySec = 0 for several hours each day.
    const todayK = todayKey(tz)
    const todaySec = byDay.get(todayK) ?? 0

    // last 14 days for chart — same fix: keys must be in the user's tz
    const chartData: Array<{ date: string; sec: number }> = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = toLocalDateKey(d.toISOString(), tz)
      chartData.push({ date: key, sec: byDay.get(key) ?? 0 })
    }

    const maxSec = Math.max(...chartData.map((c) => c.sec), 1)

    return {
      todaySec,
      todayFmt: formatMinutes(todaySec),
      weekSec: weekTotal,
      weekFmt: formatMinutes(weekTotal),
      allTimeSec: allTime,
      allTimeFmt: formatMinutes(allTime),
      byMode,
      bySubject,
      byDay,
      streak,
      bestDay: { ...bestDay, fmt: bestDay.totalSec > 0 ? formatMinutes(bestDay.totalSec) : '—' },
      chartData,
      maxSec,
    }
  }, [sessions, tz])

  return {
    isLoading: query.isLoading,
    isEmpty: sessions.length === 0,
    ...derived,
  }
}
