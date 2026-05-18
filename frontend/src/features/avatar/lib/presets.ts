// presets.ts — Registry of preset cuy avatars users can pick instead of
// uploading a photo. To add a new preset:
//   1. Drop the PNG (square, transparent or matching cream bg) into
//      frontend/public/avatars/presets/{key}.png
//   2. Add an entry below with a human-readable label (Spanish).
//
// The `key` is what gets persisted on the user record (avatarPreset field)
// and used to build the public URL at runtime.

export interface AvatarPreset {
  key: string
  label: string
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: 'abogado',       label: 'Abogado' },
  { key: 'agricultor',    label: 'Agricultor' },
  { key: 'arquitecto',    label: 'Arquitecto' },
  { key: 'artista',       label: 'Artista' },
  { key: 'astronauta',    label: 'Astronauta' },
  { key: 'chef',          label: 'Chef' },
  { key: 'cientifico',    label: 'Científico' },
  { key: 'ing_ambiental', label: 'Ingeniero Ambiental' },
  { key: 'ingeniero',     label: 'Ingeniero' },
  { key: 'marketing',     label: 'Marketing' },
  { key: 'medico',        label: 'Médico' },
  { key: 'musico',        label: 'Músico' },
  { key: 'nutricionista', label: 'Nutricionista' },
  { key: 'programador',   label: 'Programador' },
]

// Version-stamp the URL so the Service Worker (which caches images
// CacheFirst for 30 days) does not keep serving an outdated preset
// after a new deploy that updates the artwork. Bumping the app version
// in package.json is enough to bust the cache.
export function presetUrl(key: string): string {
  return `/avatars/presets/${key}.png?v=${__APP_VERSION__}`
}
