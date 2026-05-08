// useChallenges.ts — TanStack Query hooks for the challenges feature
// Covers: list, single challenge, and all mutations.
// Realtime subscription on challenges + challenge_participants for invalidation.
//
// React 19 / StrictMode safety: subscriptions are created inside useEffect
// and cleaned up via the returned unsubscribe callback — no double-subscribe risk.
//
// Reference: ARCHITECTURE.md §4, F4 scope.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import pb from '@/shared/pb'
import {
  listMyChallenges,
  getChallenge,
  createChallenge,
  joinChallenge,
  leaveChallenge,
  cancelChallenge,
  type CreateChallengeData,
} from '../api/challenges'

// ── Query keys ────────────────────────────────────────────────────────────────

const CHALLENGE_KEYS = {
  all: ['challenges'] as const,
  list: ['challenges', 'list'] as const,
  detail: (id: string) => ['challenges', 'detail', id] as const,
}

// ── Query hooks ───────────────────────────────────────────────────────────────

/** Returns all challenges the current user participates in. */
export function useMyChallenges() {
  const myId = pb.authStore.model?.id as string | undefined
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: CHALLENGE_KEYS.list,
    queryFn: listMyChallenges,
    staleTime: 30 * 1000,
    enabled: !!myId && pb.authStore.isValid,
  })

  // Realtime subscription — any change to challenges or participants refetches
  useEffect(() => {
    if (!myId) return

    let unsubChallenges: (() => void) | undefined
    let unsubParticipants: (() => void) | undefined

    void pb
      .collection('challenges')
      .subscribe('*', () => {
        void queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
      })
      .then((unsub) => { unsubChallenges = unsub })

    void pb
      .collection('challenge_participants')
      .subscribe('*', () => {
        void queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
      })
      .then((unsub) => { unsubParticipants = unsub })

    return () => {
      unsubChallenges?.()
      unsubParticipants?.()
    }
  }, [myId, queryClient])

  return query
}

/** Returns a single challenge with participants. */
export function useChallenge(id: string) {
  const myId = pb.authStore.model?.id as string | undefined
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: CHALLENGE_KEYS.detail(id),
    queryFn: () => getChallenge(id),
    staleTime: 15 * 1000,
    enabled: !!myId && pb.authStore.isValid && !!id,
  })

  useEffect(() => {
    if (!myId || !id) return

    let unsubParticipants: (() => void) | undefined

    void pb
      .collection('challenge_participants')
      .subscribe('*', () => {
        void queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.detail(id) })
      })
      .then((unsub) => { unsubParticipants = unsub })

    return () => { unsubParticipants?.() }
  }, [myId, id, queryClient])

  return query
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

/** Create a new challenge and invite participants. */
export function useCreateChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      data,
      participantUserIds,
    }: {
      data: CreateChallengeData
      participantUserIds: string[]
    }) => createChallenge(data, participantUserIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
    },
  })
}

/** Join an existing challenge as the current user. */
export function useJoinChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (challengeId: string) => joinChallenge(challengeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
    },
  })
}

/** Leave a challenge (delete the participant row). */
export function useLeaveChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (participantId: string) => leaveChallenge(participantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
    },
  })
}

/** Cancel a challenge (creator only, sets status=cancelled). */
export function useCancelChallenge() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (challengeId: string) => cancelChallenge(challengeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHALLENGE_KEYS.all })
    },
  })
}
