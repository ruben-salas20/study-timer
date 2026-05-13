// publicProfile.ts — read-only API for viewing a user's public profile.
// Used by /u/:id. Stats compute from study_sessions which is any-auth-readable
// per migration 012.
import pb from '@/shared/pb'
import type { StatsSession } from '@/features/stats/lib/aggregators'

export interface PublicUser {
  id: string
  displayName: string
  friendCode: string
  avatar?: string
  avatarPreset?: string
  weeklyGoalMinutes?: number
  timezone?: string
}

export interface SharedChallengeSummary {
  id: string
  title: string
  status: 'pending' | 'active' | 'completed'
  type: 'race' | 'duel' | 'weekly_goal' | 'group_streak'
}

/** Fetch one user's public-safe fields by id. Throws if not found / no perm. */
export async function getUserById(userId: string): Promise<PublicUser> {
  const record = await pb.collection('users').getOne(userId, {
    requestKey: `profile-user-${userId}`,
  })
  return {
    id: record.id,
    displayName: (record.displayName as string) ?? '',
    friendCode: (record.friendCode as string) ?? '',
    avatar: (record.avatar as string | undefined) || undefined,
    avatarPreset: (record.avatarPreset as string | undefined) || undefined,
    weeklyGoalMinutes: (record.weeklyGoalMinutes as number | undefined) ?? undefined,
    timezone: (record.timezone as string | undefined) ?? undefined,
  }
}

/**
 * fetchUserSessions — last `days` of completed sessions for a given user id.
 * Same shape as stats useStats so we can reuse aggregator helpers.
 */
export async function fetchUserSessions(userId: string, days = 365): Promise<StatsSession[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().replace('T', ' ').substring(0, 19)

  const result = await pb.collection('study_sessions').getList(1, 2000, {
    filter: `user = "${userId}" && endedAt != "" && startedAt >= "${cutoffStr}"`,
    sort: '-startedAt',
    requestKey: `profile-sessions-${userId}`,
  })

  return result.items.map((item) => ({
    startedAt: item.startedAt as string,
    endedAt: item.endedAt as string,
    durationSec: (item.durationSec as number) ?? 0,
    mode: (item.mode as StatsSession['mode']) ?? 'pomodoro',
    subject: (item.subject as string | undefined) || undefined,
  }))
}

/**
 * findSharedChallenges — challenges where both `userA` and `userB` are
 * participants. Implemented as two queries + JS intersection, then a final
 * batched fetch of the challenge records themselves.
 */
export async function findSharedChallenges(
  userAId: string,
  userBId: string
): Promise<SharedChallengeSummary[]> {
  if (userAId === userBId) return []

  const [aParts, bParts] = await Promise.all([
    pb.collection('challenge_participants').getList(1, 200, {
      filter: `user = "${userAId}"`,
      requestKey: `shared-parts-${userAId}`,
    }),
    pb.collection('challenge_participants').getList(1, 200, {
      filter: `user = "${userBId}"`,
      requestKey: `shared-parts-${userBId}`,
    }),
  ])

  const aChallengeIds = new Set(aParts.items.map((p) => p.challenge as string))
  const sharedIds: string[] = []
  for (const p of bParts.items) {
    const cid = p.challenge as string
    if (aChallengeIds.has(cid)) sharedIds.push(cid)
  }
  if (sharedIds.length === 0) return []

  // PB getList with `id IN ...` workaround: id = "x" || id = "y" || ...
  const filter = sharedIds.map((id) => `id = "${id}"`).join(' || ')
  const challenges = await pb.collection('challenges').getList(1, 100, {
    filter,
    sort: '-startsAt',
    requestKey: `shared-challenges-${userAId}-${userBId}`,
  })

  return challenges.items.map((c) => ({
    id: c.id,
    title: (c.title as string) ?? 'Sin título',
    status: c.status as SharedChallengeSummary['status'],
    type: c.type as SharedChallengeSummary['type'],
  }))
}

/** Is the current user friends with `otherUserId` (status=accepted)? */
export async function isFriendOf(otherUserId: string): Promise<boolean> {
  const myId = pb.authStore.model?.id as string | undefined
  if (!myId || myId === otherUserId) return false
  try {
    const list = await pb.collection('friendships').getList(1, 1, {
      filter:
        `status = "accepted" && ` +
        `((userA = "${myId}" && userB = "${otherUserId}") || ` +
        `(userA = "${otherUserId}" && userB = "${myId}"))`,
      requestKey: `is-friend-${otherUserId}`,
    })
    return list.totalItems > 0
  } catch {
    return false
  }
}
