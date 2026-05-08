// challenges.ts — Challenges feature API layer
// Wraps PocketBase SDK calls for the challenges and challenge_participants collections.
//
// Best-effort transaction note (F4):
//   createChallenge creates the challenge record first, then adds each invited
//   participant sequentially. If a participant create fails, we log a warning
//   but do NOT rollback — the challenge itself is kept. A more correct distributed
//   transaction will be implemented in F8.
//
// Reference: ARCHITECTURE.md §4, F4 scope.
import pb from '@/shared/pb'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChallengeType = 'race' | 'weekly_goal' | 'duel' | 'group_streak'
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export interface ChallengeRecord {
  id: string
  type: ChallengeType
  title: string
  description?: string
  startsAt: string
  endsAt: string
  targetSec?: number
  targetDays?: number
  prizeWinner: string
  prizeLoser?: string
  status: ChallengeStatus
  createdBy: string
  participants: ParticipantRecord[]
}

export interface ParticipantRecord {
  id: string
  challenge: string
  user: string
  /** Resolved display name from expand. Falls back to "Usuario XXXXXX" if not expanded. */
  userDisplayName: string
  /** Resolved friendCode from expand (optional). */
  userFriendCode?: string
  joinedAt: string
  progressSec: number
  streakDays: number
}

export interface CreateChallengeData {
  type: ChallengeType
  title: string
  description?: string
  startsAt: Date
  endsAt: Date
  targetSec?: number
  targetDays?: number
  prizeWinner: string
  prizeLoser?: string
  status: ChallengeStatus
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentUserId(): string {
  return pb.authStore.model?.id as string
}

function mapChallenge(record: Record<string, unknown>): ChallengeRecord {
  const expand = record.expand as Record<string, unknown[]> | undefined
  const rawParticipants = expand?.['challenge_participants_via_challenge'] ??
    expand?.['challenge_participants(challenge)'] ??
    []

  const participants: ParticipantRecord[] = rawParticipants.map((p) => {
    const part = p as Record<string, unknown>
    const partExpand = part.expand as Record<string, unknown> | undefined
    const userObj = partExpand?.user as Record<string, unknown> | undefined
    const userId = part.user as string

    const displayName = (userObj?.displayName as string) ||
      `Usuario ${userId.slice(0, 6)}`
    const friendCode = userObj?.friendCode as string | undefined

    return {
      id: part.id as string,
      challenge: part.challenge as string,
      user: userId,
      userDisplayName: displayName,
      userFriendCode: friendCode,
      joinedAt: part.joinedAt as string,
      progressSec: Number(part.progressSec ?? 0),
      streakDays: Number(part.streakDays ?? 0),
    }
  })

  return {
    id: record.id as string,
    type: record.type as ChallengeType,
    title: record.title as string,
    description: record.description as string | undefined,
    startsAt: record.startsAt as string,
    endsAt: record.endsAt as string,
    targetSec: record.targetSec as number | undefined,
    targetDays: record.targetDays as number | undefined,
    prizeWinner: record.prizeWinner as string,
    prizeLoser: record.prizeLoser as string | undefined,
    status: record.status as ChallengeStatus,
    createdBy: record.createdBy as string,
    participants,
  }
}

// PB 0.23 back-relation syntax: `<collection>_via_<field>`
// Combined with `.user` it expands the user record per participant.
const EXPAND = 'challenge_participants_via_challenge,challenge_participants_via_challenge.user'

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * createChallenge — creates a challenge + participant rows for invited users.
 * The creator is automatically added by the on-challenge-create hook on the backend.
 * This function adds the explicitly invited friends.
 */
export async function createChallenge(
  data: CreateChallengeData,
  participantUserIds: string[]
): Promise<ChallengeRecord> {
  const myId = currentUserId()

  // Serialize dates to ISO strings for PocketBase
  const payload = {
    ...data,
    createdBy: myId,
    startsAt: data.startsAt.toISOString(),
    endsAt: data.endsAt.toISOString(),
  }

  const created = (await pb.collection('challenges').create(payload)) as Record<string, unknown>

  // Add each invited participant (best-effort: log warnings, don't rollback)
  for (const userId of participantUserIds) {
    try {
      await pb.collection('challenge_participants').create({
        challenge: created.id,
        user: userId,
        joinedAt: new Date().toISOString(),
        progressSec: 0,
        streakDays: 0,
      })
    } catch (err) {
      console.warn(`[createChallenge] Failed to add participant ${userId}:`, err)
    }
  }

  return mapChallenge({ ...created, expand: undefined })
}

/**
 * joinChallenge — creates a challenge_participants row for the current user.
 * For F4: allowed if the challenge is pending and the user is a friend of the creator.
 * No strict invite check enforced client-side — PB rules guard server-side.
 */
export async function joinChallenge(challengeId: string): Promise<void> {
  const myId = currentUserId()

  await pb.collection('challenge_participants').create({
    challenge: challengeId,
    user: myId,
    joinedAt: new Date().toISOString(),
    progressSec: 0,
    streakDays: 0,
  })
}

/**
 * leaveChallenge — deletes the participant row.
 * If the user is the creator, the PB deleteRule will reject — the UI should
 * offer cancelChallenge instead.
 */
export async function leaveChallenge(participantId: string): Promise<void> {
  await pb.collection('challenge_participants').delete(participantId)
}

/**
 * cancelChallenge — patches status to "cancelled". Creator only.
 */
export async function cancelChallenge(challengeId: string): Promise<void> {
  await pb.collection('challenges').update(challengeId, { status: 'cancelled' })
}

/**
 * listMyChallenges — returns all challenges where the current user is a participant.
 * Results include participants expanded with user info.
 */
export async function listMyChallenges(): Promise<ChallengeRecord[]> {
  // Note: PB 0.23 collections do not auto-add `created`/`updated` autodate
  // fields. Sort by startsAt (newest first) which always exists.
  const result = await pb.collection('challenges').getList(1, 200, {
    expand: EXPAND,
    sort: '-startsAt',
  })

  return (result.items as unknown as Record<string, unknown>[]).map(mapChallenge)
}

/**
 * getChallenge — returns a single challenge with all participants expanded.
 */
export async function getChallenge(id: string): Promise<ChallengeRecord> {
  const record = (await pb
    .collection('challenges')
    .getOne(id, { expand: EXPAND })) as unknown as Record<string, unknown>

  return mapChallenge(record)
}
