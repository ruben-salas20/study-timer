// useChallengeParticipantSessions.ts — fetches study sessions for all participants
// in a group_streak challenge and returns them as a { userId: string[] } map,
// where each string is a UTC day "YYYY-MM-DD".
//
// Pure data hook — no side effects beyond the TanStack Query fetch.
// The aggregator (computeGroupStreakState) consumes the returned map.
import { useQueries } from '@tanstack/react-query'
import pb from '@/shared/pb'

/** Convert an ISO timestamp string to a UTC "YYYY-MM-DD" string. */
function toUtcDay(isoString: string): string {
  return isoString.slice(0, 10)
}

/** Fetch all study_sessions for a single user, returning deduplicated UTC day strings. */
async function fetchSessionDays(userId: string): Promise<string[]> {
  const result = await pb.collection('study_sessions').getList(1, 500, {
    filter: `user = "${userId}"`,
    fields: 'user,startedAt',
    sort: '-startedAt',
  })

  const days = (result.items as unknown as Array<{ user: string; startedAt: string }>).map(
    (item) => toUtcDay(item.startedAt)
  )

  // Deduplicate: a user can have multiple sessions per day
  return Array.from(new Set(days))
}

export interface ChallengeParticipantSessionsResult {
  sessionsByUser: Record<string, string[]>
  isLoading: boolean
}

/**
 * useChallengeParticipantSessions — fetches sessions for a list of userIds in parallel.
 * Returns a map of { [userId]: string[] } with UTC day strings.
 *
 * Designed for group_streak challenges.
 * Empty userIds array → returns empty map immediately (no queries issued).
 */
export function useChallengeParticipantSessions(
  userIds: string[]
): ChallengeParticipantSessionsResult {
  const queries = useQueries({
    queries: userIds.map((userId) => ({
      queryKey: ['challenge-participant-sessions', userId],
      queryFn: () => fetchSessionDays(userId),
      staleTime: 60 * 1000,
      enabled: !!userId,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)

  const sessionsByUser: Record<string, string[]> = {}
  for (let i = 0; i < userIds.length; i++) {
    const days = queries[i]?.data
    if (days !== undefined) {
      sessionsByUser[userIds[i]] = days
    }
  }

  return { sessionsByUser, isLoading }
}
