// useAchievements.ts — TanStack Query hooks for achievement unlocks.
import { useQuery } from '@tanstack/react-query'
import pb from '@/shared/pb'
import { listUnlockedFor } from '../api/achievements'

export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['achievements', 'user', userId],
    queryFn: () => listUnlockedFor(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useMyAchievements() {
  const myId = pb.authStore.model?.id as string | undefined
  return useUserAchievements(myId)
}
