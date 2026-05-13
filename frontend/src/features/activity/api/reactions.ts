// reactions.ts — activity feed reactions API.
import pb from '@/shared/pb'

export const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🚀', '🧠'] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

export interface ReactionRecord {
  id: string
  event: string
  user: string
  emoji: string
}

/** Aggregated counts + which emojis the current user already reacted with. */
export interface EventReactionSummary {
  /** emoji → number of users who reacted with it (including me). */
  counts: Record<string, number>
  /** emoji → my reaction id (if I reacted) so we can DELETE on toggle. */
  myReactionIds: Record<string, string>
}

/**
 * listReactionsForEvents — fetches all reactions for the given event ids in
 * a single request, then groups them per-event for fast lookup in the UI.
 * Empty input short-circuits to an empty map.
 */
export async function listReactionsForEvents(
  eventIds: string[]
): Promise<Map<string, EventReactionSummary>> {
  const result = new Map<string, EventReactionSummary>()
  if (eventIds.length === 0) return result

  const myId = pb.authStore.model?.id as string | undefined
  const filter = eventIds.map((id) => `event = "${id}"`).join(' || ')

  const list = await pb.collection('activity_reactions').getList(1, 500, {
    filter,
    sort: '-created',
    requestKey: `reactions-${eventIds.length}-${eventIds[0]}`,
  })

  for (const item of list.items as unknown as Record<string, unknown>[]) {
    const eventId = item.event as string
    const emoji = item.emoji as string
    const userId = item.user as string

    let summary = result.get(eventId)
    if (!summary) {
      summary = { counts: {}, myReactionIds: {} }
      result.set(eventId, summary)
    }
    summary.counts[emoji] = (summary.counts[emoji] ?? 0) + 1
    if (myId && userId === myId) {
      summary.myReactionIds[emoji] = item.id as string
    }
  }

  return result
}

/** Add a reaction. Returns the new record id. Throws on unique constraint. */
export async function addReaction(eventId: string, emoji: string): Promise<string> {
  const myId = pb.authStore.model?.id as string | undefined
  if (!myId) throw new Error('Not authenticated')

  const record = await pb.collection('activity_reactions').create({
    event: eventId,
    user: myId,
    emoji,
  })
  return record.id
}

/** Remove a reaction by id (the user's own only — server enforces). */
export async function removeReaction(reactionId: string): Promise<void> {
  await pb.collection('activity_reactions').delete(reactionId)
}
