// VisibilityModal.tsx — choose which sections of the public /u/:id page
// other people get to see. Persists into users.profileVisibility (JSON).
import { useState } from 'react'
import { X, Flame, Trophy, Calendar, Star, Award } from 'lucide-react'
import {
  updateProfile,
  resolveVisibility,
  type ProfileVisibility,
} from '../api/profile'

interface VisibilityModalProps {
  initial: ProfileVisibility | undefined
  onClose: () => void
  onSaved: () => void
}

export function VisibilityModal({ initial, onClose, onSaved }: VisibilityModalProps) {
  const resolved = resolveVisibility(initial)
  const [streak, setStreak] = useState(resolved.stats.streak)
  const [total, setTotal] = useState(resolved.stats.total)
  const [week, setWeek] = useState(resolved.stats.week)
  const [bestDay, setBestDay] = useState(resolved.stats.bestDay)
  const [achievements, setAchievements] = useState(resolved.achievements)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const next: ProfileVisibility = {
        stats: { streak, total, week, bestDay },
        achievements,
      }
      await updateProfile({ profileVisibility: next })
      onSaved()
      onClose()
    } catch (err) {
      console.error('[VisibilityModal] save failed:', err)
      setError('No pudimos guardar. Intentá de nuevo.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vis-title"
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4 shadow-xl max-h-[90dvh] overflow-y-auto"
        style={{
          background: 'var(--color-background, #ffffff)',
          color: 'var(--color-foreground, #0a0a0a)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 id="vis-title" className="text-lg font-semibold">Visibilidad de mi perfil</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 -mr-1 opacity-70 hover:opacity-100"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs opacity-60">
          Elegí qué ven tus amigos cuando visitan tu perfil público (<code className="font-mono">/u/tu-id</code>).
          Vos siempre ves todo en tu propia vista.
        </p>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50">
            Estadísticas
          </p>
          <Toggle icon={<Flame size={16} />} label="Racha"        value={streak}  onChange={setStreak} />
          <Toggle icon={<Trophy size={16} />} label="Total"        value={total}   onChange={setTotal} />
          <Toggle icon={<Calendar size={16} />} label="Esta semana" value={week}   onChange={setWeek} />
          <Toggle icon={<Star size={16} />} label="Mejor día"    value={bestDay} onChange={setBestDay} />
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50">
            Otras secciones
          </p>
          <Toggle
            icon={<Award size={16} />}
            label="Logros desbloqueados"
            value={achievements}
            onChange={setAchievements}
          />
        </section>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border font-medium"
            style={{ borderColor: 'rgba(127,127,127,0.3)' }}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-semibold disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-current/15 px-3 py-2.5 cursor-pointer">
      <span className="text-(--color-primary) shrink-0">{icon}</span>
      <span className="flex-1 text-sm">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-(--color-primary)"
      />
    </label>
  )
}
