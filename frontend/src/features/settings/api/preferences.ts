// preferences.ts — API layer for user preference updates
import pb from '@/shared/pb'

export interface PreferencePatch {
  theme?: string
  accentColor?: string
  timezone?: string
}

/**
 * updatePreferences — patches the current user's preferences fields.
 * Applies to the 'users' collection using the auth model's id.
 */
export async function updatePreferences(patch: PreferencePatch): Promise<void> {
  const userId = pb.authStore.model?.id
  if (!userId) return
  await pb.collection('users').update(String(userId), patch)
}
