// useWeeklyRanking.ts — Hook + pure aggregation logic for the weekly ranking
// Aggregates study_sessions for current user + accepted friends,
// summed by user and sorted by totalSec desc.
// Pure functions are exported separately for unit testing (TDD).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import pb from '@/shared/pb'
import { useFriendsList } from './useFriends'
import type { FriendUserInfo } from '../api/friends'
import { computeWeekTotal, type StatsSession } from '@/features/stats/lib/aggregators'

// ── Types ────────────────────────────────────────────────────────────────────

export interface RankingEntry {
  userId: string
  displayName: string
  friendCode: string
  avatarUrl?: string
  totalSec: number
  isMe: boolean
}

type SessionRecord = {
  id: string
  user: string
  durationSec: number
  startedAt: string
  endedAt: string
}

// ── Pure functions (exported for tests) ──────────────────────────────────────

/**
 * getISOWeekStart — returns the Monday 00:00:00 UTC of the ISO week
 * that contains the given date. Uses UTC day to be timezone-agnostic
 * for the week boundary calculation.
 */
export function getISOWeekStart(date: Date): Date {
  const utcDay = date.getUTCDay() // 0 = Sunday, 1 = Monday, …
  // ISO week: Monday = 1. Sunday is treated as day 7 (offset -6 from Monday)
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1
  const monday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysFromMonday,
    0, 0, 0, 0
  ))
  return monday
}

/**
 * aggregateWeeklyRanking — pure aggregation function.
 * Takes a flat list of sessions and a list of user infos,
 * sums durationSec per user, and returns sorted results (desc) with isMe flag.
 * Users with zero sessions are included with totalSec = 0.
 */
export function aggregateWeeklyRanking(
  sessions: SessionRecord[],
  users: FriendUserInfo[],
  myUserId: string
): RankingEntry[] {
  // Build a sum map keyed by userId
  const sumByUser = new Map<string, number>()

  // Initialise all known users to 0 so absent users still appear
  for (const u of users) {
    sumByUser.set(u.id, 0)
  }

  for (const session of sessions) {
    const current = sumByUser.get(session.user) ?? 0
    sumByUser.set(session.user, current + session.durationSec)
  }

  const result: RankingEntry[] = users.map((u) => ({
    userId: u.id,
    displayName: u.displayName,
    friendCode: u.friendCode,
    avatarUrl: u.avatarUrl,
    totalSec: sumByUser.get(u.id) ?? 0,
    isMe: u.id === myUserId,
  }))

  // Sort descending by totalSec
  result.sort((a, b) => b.totalSec - a.totalSec)

  return result
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useWeeklyRanking — TanStack Query hook that returns the weekly ranking.
 * Includes current user + all accepted friends, sorted by totalSec desc.
 * Realtime subscription on friendships + study_sessions for live updates.
 */
export function useWeeklyRanking() {
  const myId = pb.authStore.model?.id as string | undefined

  // Reuse the friends-list query (shared cache via TanStack Query). This
  // avoids the duplicate `listFriends()` call we had before, which caused
  // the FriendsPage to fire 4 parallel friendship requests on every mount.
  const { data: friendEntries = [] } = useFriendsList()

  // Stable user list (me + friends) — only changes when friendEntries do
  const allUsers: FriendUserInfo[] = useMemo(() => {
    if (!myId) return []
    const me: FriendUserInfo = {
      id: myId,
      displayName: (pb.authStore.model?.displayName as string) ?? 'Yo',
      friendCode: (pb.authStore.model?.friendCode as string) ?? '',
      avatarUrl: pb.authStore.model?.avatarUrl as string | undefined,
    }
    return [me, ...friendEntries.map((f) => f.user)]
  }, [myId, friendEntries])

  const allUserIdsKey = allUsers.map((u) => u.id).sort().join(',')

  const queryClient = useQueryClient()
  const tz = (pb.authStore.model?.timezone as string | undefined) ?? 'UTC'

  // Fetch a wide window (30 days) per user. Filtering down to "this week"
  // happens in JS via computeWeekTotal — same logic that the Stats page uses,
  // so the numbers always match between FriendsPage ranking and StatsPage.
  // Server-side filter with a wide net (30 days) avoids edge-of-week timezone
  // mismatches.
  const { data: weekSessions = [] } = useQuery({
    queryKey: ['friends', 'weeklyRanking-sessions', allUserIdsKey],
    queryFn: async (): Promise<Array<StatsSession & { user: string }>> => {
      if (!myId || allUsers.length === 0) return []

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 30)
      const cutoffStr = cutoff.toISOString().replace('T', ' ').substring(0, 19)

      const sessionResults = await Promise.all(
        allUsers.map((u) =>
          pb
            .collection('study_sessions')
            .getList(1, 500, {
              filter: `user = "${u.id}" && endedAt != "" && startedAt >= "${cutoffStr}"`,
            })
            .catch(() => ({ items: [] as Array<Record<string, unknown>> }))
        )
      )

      return sessionResults.flatMap((res) =>
        (res.items as Array<Record<string, unknown>>).map((item) => ({
          user: item.user as string,
          startedAt: item.startedAt as string,
          endedAt: item.endedAt as string,
          durationSec: (item.durationSec as number) ?? 0,
          mode: (item.mode as StatsSession['mode']) ?? 'pomodoro',
        }))
      )
    },
    staleTime: 60 * 1000,
    enabled: !!myId && allUsers.length > 0 && pb.authStore.isValid,
  })

  // Compute ranking by per-user week total, using the SAME week-boundary logic
  // as the Stats page. Numbers are guaranteed consistent.
  const ranking: RankingEntry[] = useMemo(() => {
    if (!myId || allUsers.length === 0) return []

    return allUsers
      .map((u) => {
        const userSessions = weekSessions
          .filter((s) => s.user === u.id)
          .map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt, durationSec: s.durationSec, mode: s.mode }))
        const totalSec = computeWeekTotal(userSessions, tz, 'monday')
        return {
          userId: u.id,
          displayName: u.displayName,
          friendCode: u.friendCode,
          avatarUrl: u.avatarUrl,
          totalSec,
          isMe: u.id === myId,
        }
      })
      .sort((a, b) => b.totalSec - a.totalSec)
  }, [myId, allUsers, weekSessions, tz])

  // Realtime: invalidate sessions cache when any session changes
  useEffect(() => {
    if (!myId) return
    let unsub: (() => void) | undefined
    void pb
      .collection('study_sessions')
      .subscribe('*', () => {
        void queryClient.invalidateQueries({ queryKey: ['friends', 'weeklyRanking-sessions'] })
      })
      .then((fn) => { unsub = fn })
    return () => { unsub?.() }
  }, [myId, queryClient])

  return { ranking }
}
