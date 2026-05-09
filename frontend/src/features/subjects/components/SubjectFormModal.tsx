// SubjectFormModal.tsx — create / edit dialog for a subject.
// Fields: emoji (optional), name, color (palette swatches).
import { useState } from 'react'
import { X as XIcon } from 'lucide-react'
import type { SubjectInput, SubjectRecord } from '../api/subjects'

interface SubjectFormModalProps {
  initial?: SubjectRecord
  onSubmit: (input: SubjectInput) => void | Promise<void>
  onCancel: () => void
  submitting?: boolean
}

// Curated emoji set focused on study / subject themes. Keeps the bundle tiny
// vs. shipping a full emoji picker (emoji-picker-react ~500KB) and avoids the
// "user pastes random text and breaks the chip" problem.
const EMOJI_OPTIONS: string[] = [
  '📚', '📖', '📝', '✏️', '📐', '📏', '🧮', '🔬',
  '🔭', '🧪', '🧬', '🧠', '💻', '⌨️', '🎨', '🎭',
  '🎵', '🎸', '🎤', '🏃', '⚽', '🏀', '🌍', '🗺️',
  '📊', '📈', '💡', '⚡', '🔥', '⭐', '🎯', '🏆',
  '❤️', '💼', '🩺', '⚖️', '🏛️', '🎓', '🌱', '☕',
]

const PALETTE: string[] = [
  '#84a98c', // sage green
  '#5b8def', // blue
  '#f0a83a', // amber
  '#ff7eb6', // pink
  '#c084fc', // purple
  '#ef4444', // red
  '#22c55e', // emerald
  '#06b6d4', // cyan
  '#a3a3a3', // neutral
  '#fbbf24', // yellow
  '#f97316', // orange
  '#14b8a6', // teal
]

export function SubjectFormModal({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
}: SubjectFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PALETTE[0])
  const [emoji, setEmoji] = useState(initial?.emoji ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 1) {
      setError('Pon un nombre a la materia')
      return
    }
    setError(null)
    await onSubmit({ name: name.trim(), color, emoji: emoji.trim() || undefined })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-form-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4 shadow-xl"
        style={{
          background: 'var(--color-background, #ffffff)',
          color: 'var(--color-foreground, #0a0a0a)',
        }}
      >
        <h2 id="subject-form-title" className="text-lg font-semibold">
          {initial ? 'Editar materia' : 'Nueva materia'}
        </h2>

        {/* Preview */}
        <div className="flex items-center justify-center py-3">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2 text-base font-medium"
            style={{
              background: `color-mix(in oklch, ${color} 18%, transparent)`,
              color: color,
            }}
          >
            {emoji && <span>{emoji}</span>}
            <span>{name.trim() || 'Vista previa'}</span>
          </div>
        </div>

        {/* Name only — emoji has its own dedicated picker below */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la materia"
          maxLength={60}
          aria-label="Nombre"
          className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
          autoFocus
        />

        {/* Emoji picker (curated grid) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-widest opacity-60">Emoji</label>
            {emoji && (
              <button
                type="button"
                onClick={() => setEmoji('')}
                className="inline-flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100"
                aria-label="Quitar emoji"
              >
                <XIcon size={11} /> Quitar
              </button>
            )}
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJI_OPTIONS.map((e) => {
              const selected = e === emoji
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(selected ? '' : e)}
                  aria-pressed={selected}
                  aria-label={`Seleccionar ${e}`}
                  className={[
                    'aspect-square flex items-center justify-center rounded-lg text-xl transition-all',
                    selected
                      ? 'bg-(--color-primary)/20 ring-2 ring-(--color-primary)'
                      : 'bg-white/[0.03] hover:bg-white/[0.08]',
                  ].join(' ')}
                >
                  {e}
                </button>
              )
            })}
          </div>
        </div>

        {/* Color palette */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest opacity-60">Color</label>
          <div className="grid grid-cols-6 gap-2">
            {PALETTE.map((c) => {
              const isSelected = c === color
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={[
                    'aspect-square rounded-full transition-all',
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-(--color-background) scale-110' : '',
                  ].join(' ')}
                  style={{ background: c, boxShadow: isSelected ? `0 0 0 2px ${c}` : undefined }}
                  aria-label={`Color ${c}`}
                  aria-pressed={isSelected}
                />
              )
            })}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl border font-medium"
            style={{ borderColor: 'rgba(127,127,127,0.3)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-semibold disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : initial ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  )
}
