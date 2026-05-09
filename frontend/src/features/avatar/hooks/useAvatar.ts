// useAvatar.ts — TanStack Query mutations for the avatar feature.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clearAvatar, setAvatarPreset, uploadAvatar } from '../api/avatar'

const AUTH_QUERY_KEY = ['auth', 'currentUser'] as const

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTH_QUERY_KEY }),
  })
}

export function useSetAvatarPreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => setAvatarPreset(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTH_QUERY_KEY }),
  })
}

export function useClearAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearAvatar(),
    onSuccess: () => qc.invalidateQueries({ queryKey: AUTH_QUERY_KEY }),
  })
}
