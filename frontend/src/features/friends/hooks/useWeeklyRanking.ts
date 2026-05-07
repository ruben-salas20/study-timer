// useWeeklyRanking.ts — Hook + pure aggregation logic for the weekly ranking
// Aggregates study_sessions for current user + accepted friends,
// summed by user and sorted by totalSec desc.
// Pure functions are exported separately for unit testing (TDD).
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import pb from '@/shared/pb'
import { listFriends } from '../api/friends'
import type { FriendUserInfo } from '../api/friends'

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

  const { data: ranking = [], refetch } = useQuery({
    queryKey: ['friends', 'weeklyRanking'],
    queryFn: async (): Promise<RankingEntry[]> => {
      if (!myId) return []

      // 1. Get accepted friends
      const friends = await listFriends()

      // Current user's info
      const me: FriendUserInfo = {
        id: myId,
        displayName: (pb.authStore.model?.displayName as string) ?? 'Yo',
        friendCode: (pb.authStore.model?.friendCode as string) ?? '',
        avatarUrl: pb.authStore.model?.avatarUrl as string | undefined,
      }

      const allUsers: FriendUserInfo[] = [me, ...friends.map((f) => f.user)]
      const allUserIds = allUsers.map((u) => u.id)

      // 2. Compute ISO week start (UTC)
      const weekStart = getISOWeekStart(new Date())
      // Format as PocketBase datetime filter: "2025-01-06 00:00:00"
      const weekStartStr = weekStart.toISOString().replace('T', ' ').substring(0, 19)

      // 3. Fetch sessions for all users in the current week
      // We use one query per user to stay within PB rule constraints
      // (friends visibility rule on study_sessions allows accepted friend reads)
      const sessionResults = await Promise.all(
        allUserIds.map((uid) =>
          pb.collection('study_sessions').getList(1, 500, {
            filter: `user = "${uid}" && endedAt != "" && startedAt >= "${weekStartStr}"`,
          })
        )
      )

      const allSessions: SessionRecord[] = sessionResults.flatMap((res) =>
        res.items.map((item) => ({
          id: item.id,
          user: (item as Record<string, unknown>).user as string,
          durationSec: ((item as Record<string, unknown>).durationSec as number) ?? 0,
          startedAt: (item as Record<string, unknown>).startedAt as string,
          endedAt: (item as Record<string, unknown>).endedAt as string,
        }))
      )

      return aggregateWeeklyRanking(allSessions, allUsers, myId)
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: !!myId && pb.authStore.isValid,
  })

  // Realtime subscription: re-fetch when any friendship changes
  useEffect(() => {
    if (!myId) return

    let unsubFriendships: (() => void) | undefined
    let unsubSessions: (() => void) | undefined

    void pb
      .collection('friendships')
      .subscribe('*', () => void refetch())
      .then((unsub) => { unsubFriendships = unsub })

    void pb
      .collection('study_sessions')
      .subscribe('*', () => void refetch())
      .then((unsub) => { unsubSessions = unsub })

    return () => {
      unsubFriendships?.()
      unsubSessions?.()
    }
  }, [myId, refetch])

  return { ranking }
}
