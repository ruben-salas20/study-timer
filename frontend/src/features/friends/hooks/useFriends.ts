// useFriends.ts — TanStack Query hooks for the friends feature
// Covers: friends list, incoming/outgoing requests, and all mutations.
// Realtime subscription on friendships collection for live updates.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import pb from '@/shared/pb'
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../api/friends'

// ── Query keys ────────────────────────────────────────────────────────────────

const FRIENDS_KEYS = {
  all: ['friends'] as const,
  list: ['friends', 'list'] as const,
  incoming: ['friends', 'incoming'] as const,
  outgoing: ['friends', 'outgoing'] as const,
  ranking: ['friends', 'weeklyRanking'] as const,
}

// ── Query hooks ───────────────────────────────────────────────────────────────

/** Returns the list of accepted friends. */
export function useFriendsList() {
  const myId = pb.authStore.model?.id as string | undefined
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: FRIENDS_KEYS.list,
    queryFn: listFriends,
    staleTime: 30 * 1000,
    enabled: !!myId && pb.authStore.isValid,
  })

  // Realtime subscription — any change to a friendship record refetches all
  useEffect(() => {
    if (!myId) return

    let unsubscribe: (() => void) | undefined

    void pb
      .collection('friendships')
      .subscribe('*', () => {
        void queryClient.invalidateQueries({ queryKey: FRIENDS_KEYS.all })
      })
      .then((unsub) => { unsubscribe = unsub })

    return () => { unsubscribe?.() }
  }, [myId, queryClient])

  return query
}

/** Returns pending requests where the current user is the receiver. */
export function useIncomingRequests() {
  const myId = pb.authStore.model?.id as string | undefined

  return useQuery({
    queryKey: FRIENDS_KEYS.incoming,
    queryFn: listIncomingRequests,
    staleTime: 30 * 1000,
    enabled: !!myId && pb.authStore.isValid,
  })
}

/** Returns pending requests where the current user is the sender. */
export function useOutgoingRequests() {
  const myId = pb.authStore.model?.id as string | undefined

  return useQuery({
    queryKey: FRIENDS_KEYS.outgoing,
    queryFn: listOutgoingRequests,
    staleTime: 30 * 1000,
    enabled: !!myId && pb.authStore.isValid,
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

/** Send a friend request by friendCode. Invalidates all friend queries. */
export function useSendFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (friendCode: string) => sendFriendRequest(friendCode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_KEYS.all })
    },
  })
}

/** Accept a pending incoming friend request. */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (friendshipId: string) => acceptFriendRequest(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_KEYS.all })
    },
  })
}

/** Reject (delete) a pending incoming friend request. */
export function useRejectFriendRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (friendshipId: string) => rejectFriendRequest(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_KEYS.all })
    },
  })
}

/** Remove an accepted friend (deletes the friendship record). */
export function useRemoveFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (friendshipId: string) => removeFriend(friendshipId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_KEYS.all })
    },
  })
}
