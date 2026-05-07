// profile.ts — API layer for profile updates
import pb from '@/shared/pb'

export interface ProfilePatch {
  displayName?: string
  weeklyGoalMinutes?: number
  timezone?: string
}

/**
 * updateProfile — patches the current user's profile fields.
 */
export async function updateProfile(patch: ProfilePatch): Promise<void> {
  const userId = pb.authStore.model?.id
  if (!userId) return
  await pb.collection('users').update(String(userId), patch)
}

/**
 * changePassword — updates the user's password using oldPassword + new password.
 * PocketBase requires oldPassword + password + passwordConfirm for auth'd users.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const userId = pb.authStore.model?.id
  if (!userId) return
  await pb.collection('users').update(String(userId), {
    oldPassword: currentPassword,
    password: newPassword,
    passwordConfirm: newPassword,
  })
}
