// PlansPage.tsx — study planner at /plan. Vertical list grouped by day so
// it works well on mobile (no week-grid cramming).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import {
  usePlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
} from '../hooks/usePlans'
import { stampLinkedSession, type PlanRecord } from '../api/plans'
import { AddPlanModal } from '../components/AddPlanModal'
import { PlanCard } from '../components/PlanCard'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useTimer } from '@/features/timer/hooks/useTimer'
import { BottomNav } from '@/shared/ui/BottomNav'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'

type Modal =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; plan: PlanRecord }

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(date, today)) return 'Hoy'
  if (sameDay(date, tomorrow)) return 'Mañana'
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  })
}

export function PlansPage() {
  const navigate = useNavigate()
  const { data: plans = [], isLoading } = usePlans()
  const { data: subjects = [] } = useSubjects()
  const createMut = useCreatePlan()
  const updateMut = useUpdatePlan()
  const deleteMut = useDeletePlan()
  const { start } = useTimer()

  const [modal, setModal] = useState<Modal>({ kind: 'closed' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, PlanRecord[]>()
    for (const p of plans) {
      const k = dayKey(p.plannedAt)
      const arr = map.get(k) ?? []
      arr.push(p)
      map.set(k, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
  }, [plans])

  async function handleStart(plan: PlanRecord) {
    setStartingId(plan.id)
    try {
      const sessionId = await start('countdown', {
        targetSec: plan.durationMin * 60,
        subjectId: plan.subjectId,
      })
      // Best-effort link — if it fails the session still runs, the plan just
      // won't auto-flip to done on session end.
      try {
        await stampLinkedSession(plan.id, sessionId)
      } catch (linkErr) {
        console.error('[PlansPage] stampLinkedSession failed:', linkErr)
      }
      navigate('/timer/active')
    } catch (err) {
      console.error('[PlansPage] start failed:', err)
      setStartingId(null)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingId) return
    try {
      await deleteMut.mutateAsync(deletingId)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="flex items-center justify-between px-6 pt-10 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/me')}
            aria-label="Volver"
            className="p-2 -ml-2"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-2xl font-bold">Plan de estudio</h1>
        </div>
        <button
          type="button"
          onClick={() => setModal({ kind: 'create' })}
          aria-label="Nuevo plan"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-(--color-primary) text-white"
        >
          <Plus size={18} />
        </button>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-5">
        {isLoading && (
          <div className="flex flex-col gap-3">
            <Skeleton height="6rem" />
            <Skeleton height="6rem" />
          </div>
        )}

        {!isLoading && plans.length === 0 && (
          <EmptyState
            icon="🗓️"
            title="Aún no planeaste nada"
            description="Agendá tu próxima sesión con materia, hora y duración. Te avisamos 10 min antes."
            action={
              <button
                type="button"
                onClick={() => setModal({ kind: 'create' })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--color-primary) text-white text-sm font-semibold"
              >
                <Plus size={14} /> Crear plan
              </button>
            }
          />
        )}

        {grouped.map(([day, dayPlans]) => (
          <section key={day} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-50">
              {formatDayLabel(day)}
            </p>
            <div className="flex flex-col gap-2">
              {dayPlans.map((p) => {
                const subject = p.subjectId
                  ? subjects.find((s) => s.id === p.subjectId) ?? null
                  : null
                return (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    subject={subject}
                    starting={startingId === p.id}
                    onStart={() => void handleStart(p)}
                    onEdit={() => setModal({ kind: 'edit', plan: p })}
                    onDelete={() => setDeletingId(p.id)}
                  />
                )
              })}
            </div>
          </section>
        ))}
      </main>

      <BottomNav />

      {modal.kind === 'create' && (
        <AddPlanModal
          submitting={createMut.isPending}
          onCancel={() => setModal({ kind: 'closed' })}
          onSubmit={async (input) => {
            await createMut.mutateAsync(input)
            setModal({ kind: 'closed' })
          }}
        />
      )}

      {modal.kind === 'edit' && (
        <AddPlanModal
          initial={modal.plan}
          submitting={updateMut.isPending}
          onCancel={() => setModal({ kind: 'closed' })}
          onSubmit={async (input) => {
            await updateMut.mutateAsync({ id: modal.plan.id, patch: input })
            setModal({ kind: 'closed' })
          }}
        />
      )}

      <ConfirmDialog
        isOpen={deletingId !== null}
        title="¿Eliminar este plan?"
        description="No vas a poder recuperarlo. La sesión que ya iniciaste desde este plan no se borra."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  )
}
