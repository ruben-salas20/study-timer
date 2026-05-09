// AvatarPickerModal.tsx — opens from the profile screen, lets the user
// either upload a custom photo or pick one of the bundled cuy presets.
import { useRef, useState } from 'react'
import { Upload, Trash2 } from 'lucide-react'
import { AVATAR_PRESETS, presetUrl } from '../lib/presets'
import {
  useClearAvatar,
  useSetAvatarPreset,
  useUploadAvatar,
} from '../hooks/useAvatar'
import { Avatar } from './Avatar'

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

interface Props {
  userId: string
  currentAvatar?: string
  currentPreset?: string
  displayName?: string
  onClose: () => void
}

export function AvatarPickerModal({
  userId,
  currentAvatar,
  currentPreset,
  displayName,
  onClose,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const uploadMut = useUploadAvatar()
  const presetMut = useSetAvatarPreset()
  const clearMut = useClearAvatar()

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen')
      return
    }
    if (f.size > MAX_BYTES) {
      setError(`La imagen no puede pesar más de 2 MB (esta pesa ${(f.size / 1024 / 1024).toFixed(1)} MB)`)
      return
    }
    setError(null)
    setPending(true)
    try {
      await uploadMut.mutateAsync(f)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto')
    } finally {
      setPending(false)
    }
  }

  async function onPickPreset(key: string) {
    setError(null)
    setPending(true)
    try {
      await presetMut.mutateAsync(key)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setPending(false)
    }
  }

  async function onClear() {
    setError(null)
    setPending(true)
    try {
      await clearMut.mutateAsync()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al quitar la foto')
    } finally {
      setPending(false)
    }
  }

  const hasSomething = !!currentAvatar || !!currentPreset

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4 shadow-xl max-h-[85vh] overflow-y-auto"
        style={{
          background: 'var(--color-background, #ffffff)',
          color: 'var(--color-foreground, #0a0a0a)',
        }}
      >
        <h2 id="avatar-picker-title" className="text-lg font-semibold">
          Cambiar avatar
        </h2>

        {/* Current preview */}
        <div className="flex justify-center py-1">
          <Avatar
            userId={userId}
            avatar={currentAvatar}
            avatarPreset={currentPreset}
            displayName={displayName}
            className="w-20 h-20"
            textClassName="text-2xl"
          />
        </div>

        {/* Upload custom */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest opacity-60">
            Sube tu foto
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-current/20 text-sm font-medium hover:bg-white/5 disabled:opacity-50"
          >
            <Upload size={16} />
            Elegir imagen (máx 2 MB)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onFileChosen}
            className="hidden"
          />
        </div>

        {/* Preset cuys */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest opacity-60">
            O elige un cuy
          </span>
          {AVATAR_PRESETS.length === 0 ? (
            <p className="text-xs opacity-60 italic py-2">
              Los cuys preestablecidos llegarán pronto.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_PRESETS.map((p) => {
                const isSelected = p.key === currentPreset
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => onPickPreset(p.key)}
                    disabled={pending}
                    aria-pressed={isSelected}
                    title={p.label}
                    className={[
                      'aspect-square rounded-xl overflow-hidden transition-all border-2',
                      isSelected
                        ? 'border-(--color-primary) scale-105 shadow-md'
                        : 'border-transparent hover:border-white/20',
                    ].join(' ')}
                  >
                    <img
                      src={presetUrl(p.key)}
                      alt={p.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          {hasSomething && (
            <button
              type="button"
              onClick={() => void onClear()}
              disabled={pending}
              className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 size={14} /> Quitar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 py-3 rounded-xl border font-medium disabled:opacity-50"
            style={{ borderColor: 'rgba(127,127,127,0.3)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
