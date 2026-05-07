// useTodayStats.ts — Fetches today and this week's study session totals.
// Returns todaySec (seconds studied today) and weekSec (seconds this week).
// Uses TanStack Query with a 5-minute stale time.
import { useQuery } from '@tanstack/react-query'
import pb from '@/shared/pb'

function getTodayFilterStart(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  return start.toISOString().replace('T', ' ').substring(0, 19)
}

function getWeekFilterStart(): string {
  const now = new Date()
  // ISO week starts Monday
  const day = now.getDay() // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0)
  return monday.toISOString().replace('T', ' ').substring(0, 19)
}

async function fetchTodayStats(): Promise<{ todaySec: number; weekSec: number }> {
  const user = pb.authStore.model
  if (!user?.id) return { todaySec: 0, weekSec: 0 }

  const todayStart = getTodayFilterStart()
  const weekStart = getWeekFilterStart()

  // Completed sessions only (endedAt is not empty)
  const [todayResult, weekResult] = await Promise.all([
    pb.collection('study_sessions').getList(1, 500, {
      filter: `user = "${user.id}" && endedAt != "" && startedAt >= "${todayStart}"`,
    }),
    pb.collection('study_sessions').getList(1, 500, {
      filter: `user = "${user.id}" && endedAt != "" && startedAt >= "${weekStart}"`,
    }),
  ])

  const todaySec = todayResult.items.reduce(
    (sum, s) => sum + ((s as Record<string, number>).durationSec ?? 0),
    0
  )
  const weekSec = weekResult.items.reduce(
    (sum, s) => sum + ((s as Record<string, number>).durationSec ?? 0),
    0
  )

  return { todaySec, weekSec }
}

export function useTodayStats() {
  const { data } = useQuery({
    queryKey: ['timer', 'todayStats'],
    queryFn: fetchTodayStats,
    staleTime: 30 * 1000, // 30s — refresh quickly after sessions end
    refetchOnMount: 'always',
    enabled: pb.authStore.isValid,
  })

  return {
    todaySec: data?.todaySec ?? 0,
    weekSec: data?.weekSec ?? 0,
  }
}
