// PlanCard.tsx — visual card for a single study_plans record.
// Shows time, subject, duration, notes preview. Action row: Iniciar, Editar,
// Eliminar. "Iniciar" hides once the plan is `done`.
import { Pencil, Play, Trash2, Check } from 'lucide-react'
import type { PlanRecord } from '../api/plans'
import type { SubjectRecord } from '@/features/subjects/api/subjects'

interface PlanCardProps {
  plan: PlanRecord
  subject: SubjectRecord | null
  /** Tap "Iniciar" — start the timer from this plan. Disabled if plan is done. */
  onStart: () => void
  onEdit: () => void
  onDelete: () => void
  starting?: boolean
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function relativeUntil(iso: string): string | null {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = then - now
  if (diffMs < -60 * 60 * 1000) return null // > 1h en el pasado, no mostramos
  if (diffMs < 0) return 'Ahora'
  if (diffMs < 60 * 1000) return 'en menos de 1 min'
  if (diffMs < 60 * 60 * 1000) return `en ${Math.round(diffMs / 60_000)} min`
  if (diffMs < 24 * 60 * 60 * 1000) return `en ${Math.round(diffMs / 3_600_000)} h`
  return null
}

export function PlanCard({
  plan,
  subject,
  onStart,
  onEdit,
  onDelete,
  starting,
}: PlanCardProps) {
  const isDone = plan.status === 'done'
  const rel = !isDone ? relativeUntil(plan.plannedAt) : null

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-3"
      style={{
        borderColor: isDone
          ? 'rgba(127,127,127,0.2)'
          : subject?.color
            ? `${subject.color}55`
            : 'rgba(127,127,127,0.25)',
        opacity: isDone ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base font-semibold tabular-nums">{formatTime(plan.plannedAt)}</span>
        <span className="opacity-40">·</span>
        <span className="text-sm font-medium">{formatDuration(plan.durationMin)}</span>
        {subject && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: `${subject.color}22`, color: subject.color }}
          >
            {subject.emoji && <span>{subject.emoji}</span>}
            {subject.name}
          </span>
        )}
        {isDone ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-(--color-primary)">
            <Check size={12} /> Hecho
          </span>
        ) : rel ? (
          <span className="ml-auto text-[11px] opacity-60">{rel}</span>
        ) : null}
      </div>

      {plan.notes && (
        <p className="text-sm opacity-80 whitespace-pre-wrap line-clamp-3">{plan.notes}</p>
      )}

      <div className="flex items-center gap-2 -mb-1">
        {!isDone && (
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color-primary) text-white text-xs font-semibold disabled:opacity-60"
          >
            <Play size={12} fill="white" />
            {starting ? 'Iniciando…' : 'Iniciar'}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar plan"
          className="ml-auto p-1.5 rounded-lg hover:bg-white/5 opacity-70"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Eliminar plan"
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 opacity-70"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
