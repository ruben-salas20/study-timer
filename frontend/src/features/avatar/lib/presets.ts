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
  { key: 'abogado',     label: 'Abogado' },
  { key: 'agricultor',  label: 'Agricultor' },
  { key: 'arquitecto',  label: 'Arquitecto' },
  { key: 'artista',     label: 'Artista' },
  { key: 'astronauta',  label: 'Astronauta' },
  { key: 'chef',        label: 'Chef' },
  { key: 'cientifico',  label: 'Científico' },
  { key: 'ingeniero',   label: 'Ingeniero' },
  { key: 'medico',      label: 'Médico' },
  { key: 'musico',      label: 'Músico' },
  { key: 'programador', label: 'Programador' },
]

export function presetUrl(key: string): string {
  return `/avatars/presets/${key}.png`
}
