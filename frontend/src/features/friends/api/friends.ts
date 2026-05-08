// friends.ts — Friends feature API layer
// Wraps PocketBase SDK calls for the friendships collection.
//
// Pair ordering note: the server hook (on-friendship-create.js) normalises
// userA < userB lexicographically, so the client can pass them in any order.
// The hook also overrides requestedBy with the server auth identity.
import pb from '@/shared/pb'

// ── Types ────────────────────────────────────────────────────────────────────

export interface FriendUserInfo {
  id: string
  displayName: string
  friendCode: string
  avatarUrl?: string
}

export interface FriendshipEntry {
  friendshipId: string
  user: FriendUserInfo
  status: 'pending' | 'accepted' | 'blocked'
  requestedBy: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function currentUserId(): string {
  return pb.authStore.model?.id as string
}

/** Extract the OTHER user's info from an expanded friendship record. */
function otherUserFromExpand(
  record: Record<string, unknown>,
  myId: string
): FriendUserInfo {
  const expand = record.expand as Record<string, Record<string, unknown>> | undefined
  const isUserA = (record.userA as string) === myId
  const otherExpand = isUserA ? expand?.userB : expand?.userA

  if (!otherExpand) {
    // Fallback when expand is missing — return minimal info
    const otherId = isUserA ? (record.userB as string) : (record.userA as string)
    return { id: otherId, displayName: otherId, friendCode: '' }
  }

  return {
    id: otherExpand.id as string,
    displayName: (otherExpand.displayName as string) ?? '',
    friendCode: (otherExpand.friendCode as string) ?? '',
    avatarUrl: otherExpand.avatarUrl as string | undefined,
  }
}

// ── API functions ────────────────────────────────────────────────────────────

/**
 * sendFriendRequest — find user by friendCode and create a pending friendship.
 * Throws if:
 *   - friendCode not found → 'Friend not found'
 *   - trying to add yourself → 'Cannot add yourself'
 *   - duplicate (server hook) → propagates server error message
 */
export async function sendFriendRequest(
  friendCode: string
): Promise<Record<string, unknown>> {
  const myId = currentUserId()

  // Find the target user by their friendCode
  let targetUser: Record<string, unknown>
  try {
    targetUser = (await pb
      .collection('users')
      .getFirstListItem(`friendCode = "${friendCode}"`)) as Record<string, unknown>
  } catch {
    throw new Error('Friend not found')
  }

  if (targetUser.id === myId) {
    throw new Error('Cannot add yourself as a friend')
  }

  // Create the friendship record (hook will normalise order + set requestedBy)
  return pb.collection('friendships').create({
    userA: myId,
    userB: targetUser.id,
    status: 'pending',
    requestedBy: myId,
  }) as Promise<Record<string, unknown>>
}

/**
 * acceptFriendRequest — patch the friendship status to 'accepted'.
 * Only the receiver should call this (enforced by DB rules).
 */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await pb.collection('friendships').update(friendshipId, { status: 'accepted' })
}

/**
 * rejectFriendRequest — delete the pending friendship record.
 */
export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  await pb.collection('friendships').delete(friendshipId)
}

/**
 * removeFriend — delete an accepted friendship record.
 * Same operation as reject; separated for semantic clarity in the UI.
 */
export async function removeFriend(friendshipId: string): Promise<void> {
  await pb.collection('friendships').delete(friendshipId)
}

/**
 * listFriends — returns accepted friendships with the OTHER user's basic info.
 */
export async function listFriends(): Promise<FriendshipEntry[]> {
  const myId = currentUserId()
  const result = await pb.collection('friendships').getList(1, 200, {
    filter: `status = "accepted" && (userA = "${myId}" || userB = "${myId}")`,
    expand: 'userA,userB',
    sort: '-created',
  })

  return result.items.map((record) => {
    const r = record as unknown as Record<string, unknown>
    return {
      friendshipId: r.id as string,
      user: otherUserFromExpand(r, myId),
      status: 'accepted' as const,
      requestedBy: r.requestedBy as string,
    }
  })
}

/**
 * listIncomingRequests — pending requests where the current user is NOT the requester.
 */
export async function listIncomingRequests(): Promise<FriendshipEntry[]> {
  const myId = currentUserId()
  const result = await pb.collection('friendships').getList(1, 200, {
    filter: `status = "pending" && requestedBy != "${myId}" && (userA = "${myId}" || userB = "${myId}")`,
    expand: 'userA,userB',
    sort: '-created',
  })

  return result.items.map((record) => {
    const r = record as unknown as Record<string, unknown>
    return {
      friendshipId: r.id as string,
      user: otherUserFromExpand(r, myId),
      status: 'pending' as const,
      requestedBy: r.requestedBy as string,
    }
  })
}

/**
 * listOutgoingRequests — pending requests where the current user IS the requester.
 */
export async function listOutgoingRequests(): Promise<FriendshipEntry[]> {
  const myId = currentUserId()
  const result = await pb.collection('friendships').getList(1, 200, {
    filter: `status = "pending" && requestedBy = "${myId}"`,
    expand: 'userA,userB',
    sort: '-created',
  })

  return result.items.map((record) => {
    const r = record as unknown as Record<string, unknown>
    return {
      friendshipId: r.id as string,
      user: otherUserFromExpand(r, myId),
      status: 'pending' as const,
      requestedBy: r.requestedBy as string,
    }
  })
}
