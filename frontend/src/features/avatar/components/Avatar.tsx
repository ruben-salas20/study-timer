// Avatar.tsx — single source of truth for rendering a user's avatar.
//
// Render priority:
//   1. `avatar` file on the user record (uploaded photo)  → PB file URL
//   2. `avatarPreset` key on the user record               → /avatars/presets/{key}.png
//   3. Fallback                                            → coloured circle with initials
import { presetUrl } from '../lib/presets'

const PB_URL = (import.meta.env.VITE_PB_URL as string | undefined) ?? ''

interface AvatarProps {
  /** User id — required to build the file URL */
  userId: string
  /** Filename stored on the users record (PB FileField returns just the filename). */
  avatar?: string
  avatarPreset?: string
  displayName?: string
  /** Tailwind size class on the wrapping div (e.g. "w-10 h-10"). */
  className?: string
  /** Tailwind text size for the fallback initials (e.g. "text-base"). */
  textClassName?: string
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

export function Avatar({
  userId,
  avatar,
  avatarPreset,
  displayName,
  className = 'w-10 h-10',
  textClassName = 'text-sm',
}: AvatarProps) {
  // Uploaded photo wins. PB serves files at /api/files/{collection}/{id}/{file}.
  // The thumb query asks PB to return a downscaled variant — we set it to 200
  // so even a 2 MB original becomes a small payload on the wire.
  if (avatar && userId) {
    const src = `${PB_URL.replace(/\/$/, '')}/api/files/users/${userId}/${avatar}?thumb=200x200`
    return (
      <img
        src={src}
        alt={displayName ?? 'Avatar'}
        className={`${className} rounded-full object-cover`}
        loading="lazy"
      />
    )
  }

  // Preset cuy
  if (avatarPreset) {
    return (
      <img
        src={presetUrl(avatarPreset)}
        alt={displayName ?? 'Avatar'}
        className={`${className} rounded-full object-cover bg-(--color-primary)/10`}
        loading="lazy"
      />
    )
  }

  // Initials fallback
  return (
    <div
      className={`${className} rounded-full bg-(--color-primary) text-white flex items-center justify-center font-bold ${textClassName}`}
      aria-label={displayName ?? 'Avatar'}
    >
      {getInitials(displayName ?? '?')}
    </div>
  )
}
