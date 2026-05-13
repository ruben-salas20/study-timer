// feed.ts — activity feed API layer.
// Reads from activity_events filtered to the user + their friends.
import pb from '@/shared/pb'

export type ActivityType = 'session_completed' | 'challenge_won'

export interface ActivityActor {
  id: string
  displayName: string
  avatar?: string
  avatarPreset?: string
}

export interface SessionCompletedPayload {
  durationSec: number
  mode: 'pomodoro' | 'stopwatch' | 'countdown'
  subject: string | null
  sessionId: string
}

export interface ChallengeWonPayload {
  challengeId: string
  challengeTitle: string
  challengeType: 'race' | 'duel' | 'weekly_goal' | 'group_streak'
  progressSec?: number
  streakDays?: number
}

export type ActivityPayload = SessionCompletedPayload | ChallengeWonPayload

export interface ActivityEvent {
  id: string
  type: ActivityType
  actor: ActivityActor
  payload: ActivityPayload
  created: string
}

export interface FeedPage {
  events: ActivityEvent[]
  totalItems: number
  totalPages: number
  page: number
}

/**
 * listActivityFeed — fetches events authored by any user in `actorIds`,
 * newest first. PocketBase has no native `IN` operator on relations, so we
 * build a long `actor = "..." || actor = "..."` filter. Empty input returns
 * an empty page without hitting the server.
 */
export async function listActivityFeed(
  actorIds: string[],
  page = 1,
  perPage = 30
): Promise<FeedPage> {
  if (actorIds.length === 0) {
    return { events: [], totalItems: 0, totalPages: 0, page }
  }

  const filter = actorIds.map((id) => `actor = "${id}"`).join(' || ')

  const result = await pb.collection('activity_events').getList(page, perPage, {
    filter,
    sort: '-created',
    expand: 'actor',
    requestKey: `feed-${page}-${actorIds.length}`,
  })

  const events: ActivityEvent[] = result.items.map((item) => {
    const r = item as unknown as Record<string, unknown>
    const expand = r.expand as { actor?: Record<string, unknown> } | undefined
    const actorRecord = expand?.actor ?? {}

    return {
      id: r.id as string,
      type: r.type as ActivityType,
      actor: {
        id: (actorRecord.id as string | undefined) ?? (r.actor as string),
        displayName: (actorRecord.displayName as string | undefined) ?? '—',
        avatar: (actorRecord.avatar as string | undefined) || undefined,
        avatarPreset: (actorRecord.avatarPreset as string | undefined) || undefined,
      },
      payload: (r.payload ?? {}) as ActivityPayload,
      created: r.created as string,
    }
  })

  return {
    events,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    page: result.page,
  }
}
