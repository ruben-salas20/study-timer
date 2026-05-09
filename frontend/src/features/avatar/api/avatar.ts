// avatar.ts — API helpers for the avatar feature.
//
// PocketBase stores both the file (in the avatar FileField) and a free-text
// preset key (avatarPreset). Helpers below keep them mutually exclusive:
// setting one clears the other so the resolver in <Avatar /> never has to
// guess which one wins.
import pb from '@/shared/pb'

function currentUserId(): string {
  const id = pb.authStore.model?.id as string | undefined
  if (!id) throw new Error('Not authenticated')
  return id
}

/** Upload a new avatar photo and clear any active preset. */
export async function uploadAvatar(file: File): Promise<void> {
  const id = currentUserId()
  const form = new FormData()
  form.append('avatar', file)
  form.append('avatarPreset', '')
  await pb.collection('users').update(id, form)
}

/** Select a preset cuy and clear any uploaded photo. */
export async function setAvatarPreset(presetKey: string): Promise<void> {
  const id = currentUserId()
  // Send avatar=null via form-data trick: PB clears file fields when sent as empty.
  // Using a regular JSON update with avatar: null does NOT clear the file in
  // PB 0.23, but updating to "" via form-data does.
  const form = new FormData()
  form.append('avatar', '')
  form.append('avatarPreset', presetKey)
  await pb.collection('users').update(id, form)
}

/** Remove both photo and preset (back to initials). */
export async function clearAvatar(): Promise<void> {
  const id = currentUserId()
  const form = new FormData()
  form.append('avatar', '')
  form.append('avatarPreset', '')
  await pb.collection('users').update(id, form)
}
