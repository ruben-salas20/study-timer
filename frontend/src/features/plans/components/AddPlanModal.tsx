// AddPlanModal.tsx — create or edit a study plan.
// Inputs: subject (optional), planned datetime, duration (quick presets +
// custom), notes (optional, 200 chars).
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { DateTimePicker } from '@/shared/ui/DateTimePicker'
import type { PlanInput, PlanRecord } from '../api/plans'

const DURATION_PRESETS = [15, 25, 45, 60, 90, 120] as const

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toLocalInputValue(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(Math.round(d.getMinutes() / 5) * 5)}`
}

function fromLocalInputValue(local: string): string {
  return new Date(local).toISOString()
}

interface AddPlanModalProps {
  initial?: PlanRecord | null
  submitting: boolean
  onCancel: () => void
  onSubmit: (input: PlanInput) => void | Promise<void>
}

export function AddPlanModal({ initial, submitting, onCancel, onSubmit }: AddPlanModalProps) {
  const { data: subjects = [] } = useSubjects()
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subjectId ?? null)
  const [plannedLocal, setPlannedLocal] = useState<string>(
    toLocalInputValue(initial?.plannedAt)
  )
  const [durationMin, setDurationMin] = useState<number>(initial?.durationMin ?? 45)
  const [notes, setNotes] = useState<string>(initial?.notes ?? '')

  // Re-sync when editing a different plan (modal reused).
  useEffect(() => {
    setSubjectId(initial?.subjectId ?? null)
    setPlannedLocal(toLocalInputValue(initial?.plannedAt))
    setDurationMin(initial?.durationMin ?? 45)
    setNotes(initial?.notes ?? '')
  }, [initial])

  async function handleSave() {
    if (durationMin < 1) return
    await onSubmit({
      subjectId,
      plannedAt: fromLocalInputValue(plannedLocal),
      durationMin,
      notes: notes.trim() || undefined,
    })
  }

  const isEdit = !!initial

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-plan-title"
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4 shadow-xl max-h-[90dvh] overflow-y-auto"
        style={{
          background: 'var(--color-background, #ffffff)',
          color: 'var(--color-foreground, #0a0a0a)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 id="add-plan-title" className="text-lg font-semibold">
            {isEdit ? 'Editar plan' : 'Nuevo plan'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="p-1 -mr-1 opacity-70 hover:opacity-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Subject ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Materia</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubjectId(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{
                background: !subjectId ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'transparent',
                borderColor: !subjectId ? 'var(--color-primary)' : 'rgba(127,127,127,0.25)',
              }}
            >
              Sin materia
            </button>
            {subjects.map((s) => {
              const selected = subjectId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubjectId(s.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    background: selected ? `${s.color}22` : 'transparent',
                    borderColor: selected ? s.color : 'rgba(127,127,127,0.25)',
                    color: selected ? s.color : undefined,
                  }}
                >
                  {s.emoji && <span>{s.emoji}</span>}
                  {s.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── DateTime ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Fecha y hora</label>
          <DateTimePicker
            value={plannedLocal}
            onChange={setPlannedLocal}
            ariaLabelDate="Fecha del plan"
          />
        </div>

        {/* ── Duration ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Duración</label>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDurationMin(m)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{
                  background: durationMin === m ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'transparent',
                  borderColor: durationMin === m ? 'var(--color-primary)' : 'rgba(127,127,127,0.25)',
                }}
              >
                {m} min
              </button>
            ))}
            <div className="inline-flex items-center gap-2 ml-1">
              <input
                type="number"
                min={1}
                max={600}
                value={durationMin}
                onChange={(e) => setDurationMin(Math.max(1, Math.min(600, Number(e.target.value) || 0)))}
                className="w-20 px-2 py-1 rounded-lg border bg-transparent text-sm tabular-nums"
                style={{ borderColor: 'rgba(127,127,127,0.3)' }}
              />
              <span className="text-xs opacity-60">min</span>
            </div>
          </div>
        </div>

        {/* ── Notes ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="plan-notes">
            Notas <span className="opacity-50 font-normal">(opcional)</span>
          </label>
          <textarea
            id="plan-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="Capítulo 3, ejercicios 1-10..."
            className="w-full rounded-xl border bg-transparent p-3 text-sm resize-none"
            style={{ borderColor: 'rgba(127,127,127,0.3)' }}
          />
          <span className="text-[11px] opacity-50 text-right tabular-nums">{notes.length}/200</span>
        </div>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border font-medium"
            style={{ borderColor: 'rgba(127,127,127,0.3)' }}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting || durationMin < 1}
            className="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-semibold disabled:opacity-60"
          >
            {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
