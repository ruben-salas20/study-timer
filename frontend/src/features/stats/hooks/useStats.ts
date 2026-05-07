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
  computeStreakDays,
  computeBestDay,
  computeWeekTotal,
  type StatsSession,
} from '../lib/aggregators'

// ── Query key ─────────────────────────────────────────────────────────────────

const STATS_KEYS = {
  all: ['stats'] as const,
  sessions: ['stats', 'sessions'] as const,
}

// ── Data fetcher ──────────────────────────────────────────────────────────────

async function fetchLast90DaysSessions(): Promise<StatsSession[]> {
  const user = pb.authStore.model
  if (!user?.id) return []

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
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
    const streak = computeStreakDays(sessions, tz)
    const bestDay = computeBestDay(sessions, tz)
    const weekTotal = computeWeekTotal(sessions, tz)
    const allTime = sessions.reduce((s, sess) => s + sess.durationSec, 0)

    // Today sessions
    const todayKey = new Date().toISOString().slice(0, 10)
    const todaySec = byDay.get(todayKey) ?? 0

    // last 14 days for chart
    const chartData: Array<{ date: string; sec: number }> = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
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
