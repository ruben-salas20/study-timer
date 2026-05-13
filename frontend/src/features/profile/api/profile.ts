// profile.ts — API layer for profile updates
import pb from '@/shared/pb'

/** Shape of users.profileVisibility — every field optional, default = show. */
export interface ProfileVisibility {
  stats?: {
    streak?: boolean
    total?: boolean
    week?: boolean
    bestDay?: boolean
  }
  achievements?: boolean
}

export interface ProfilePatch {
  displayName?: string
  weeklyGoalMinutes?: number
  timezone?: string
  profileVisibility?: ProfileVisibility
}

/**
 * resolveVisibility — apply defaults to a possibly-missing profileVisibility.
 * Treats any unset section as "visible" so existing users see their full
 * profile until they explicitly hide something.
 */
export function resolveVisibility(raw: ProfileVisibility | undefined | null): {
  stats: { streak: boolean; total: boolean; week: boolean; bestDay: boolean }
  achievements: boolean
} {
  const v = raw ?? {}
  return {
    stats: {
      streak: v.stats?.streak ?? true,
      total: v.stats?.total ?? true,
      week: v.stats?.week ?? true,
      bestDay: v.stats?.bestDay ?? true,
    },
    achievements: v.achievements ?? true,
  }
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
