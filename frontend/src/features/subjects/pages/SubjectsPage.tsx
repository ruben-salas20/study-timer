// SubjectsPage.tsx — manage user's subjects + entry-point to per-subject notes.
// Tap a row body → /subjects/:id (notes for that subject). Edit/delete icons
// on the right preserve CRUD. A "Sin materia" pseudo-row at the bottom surfaces
// notes that were never tagged.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Plus, Pencil, Trash2, StickyNote, ChevronRight } from 'lucide-react'
import {
  useCreateSubject,
  useDeleteSubject,
  useSubjects,
  useUpdateSubject,
} from '../hooks/useSubjects'
import { SubjectFormModal } from '../components/SubjectFormModal'
import type { SubjectRecord } from '../api/subjects'
import { BottomNav } from '@/shared/ui/BottomNav'
import { listSessionsWithNotes } from '@/features/timer/api/sessions'

type Modal =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; subject: SubjectRecord }
  | { kind: 'delete'; subject: SubjectRecord }

export function SubjectsPage() {
  const navigate = useNavigate()
  const { data: subjects = [], isLoading } = useSubjects()
  const createMut = useCreateSubject()
  const updateMut = useUpdateSubject()
  const deleteMut = useDeleteSubject()
  const [modal, setModal] = useState<Modal>({ kind: 'closed' })

  const { data: notesSessions } = useQuery({
    queryKey: ['notes', 'list'],
    queryFn: () => listSessionsWithNotes(),
    staleTime: 60_000,
  })

  const { countsBySubject, noneCount } = useMemo(() => {
    const counts = new Map<string, number>()
    let none = 0
    for (const n of notesSessions ?? []) {
      if (!n.subjectId) {
        none++
      } else {
        counts.set(n.subjectId, (counts.get(n.subjectId) ?? 0) + 1)
      }
    }
    return { countsBySubject: counts, noneCount: none }
  }, [notesSessions])

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10"
            aria-label="Volver"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Materias</h1>
        </div>
        <button
          type="button"
          onClick={() => setModal({ kind: 'create' })}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-(--color-primary) text-white"
          aria-label="Nueva materia"
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-6 gap-3">
        {isLoading ? (
          <p className="text-sm opacity-50 text-center py-6">Cargando…</p>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 opacity-70">
            <p className="text-base">Aún no tienes materias</p>
            <p className="text-xs opacity-60 text-center max-w-xs">
              Crea materias para etiquetar tus sesiones de estudio y ver el desglose en estadísticas.
            </p>
            <button
              type="button"
              onClick={() => setModal({ kind: 'create' })}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--color-primary) text-white text-sm font-medium"
            >
              <Plus size={14} /> Crear la primera
            </button>
          </div>
        ) : (
          <>
            {subjects.map((s) => {
              const noteCount = countsBySubject.get(s.id) ?? 0
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/subjects/${s.id}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 px-2 py-1 rounded-lg hover:bg-white/5 text-left"
                    aria-label={`Abrir notas de ${s.name}`}
                  >
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 text-lg"
                      style={{
                        background: `color-mix(in oklch, ${s.color} 22%, transparent)`,
                        color: s.color,
                      }}
                    >
                      {s.emoji || s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{s.name}</span>
                      <span className="text-[11px] opacity-50 inline-flex items-center gap-1">
                        <StickyNote size={11} />
                        {noteCount === 0 ? 'Sin notas' : `${noteCount} nota${noteCount === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <ChevronRight size={16} className="opacity-40 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: 'edit', subject: s })}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 opacity-70"
                    aria-label={`Editar ${s.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: 'delete', subject: s })}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-400 opacity-70"
                    aria-label={`Eliminar ${s.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}

            {/* "Sin materia" pseudo-row — surfaces orphan notes so they don't
                disappear from the new merged Materias+Notas flow. Only shown
                when the user actually has untagged notes. */}
            {noneCount > 0 && (
              <button
                type="button"
                onClick={() => navigate('/subjects/none')}
                className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-transparent px-4 py-3 text-left hover:border-white/30 transition-colors"
                aria-label="Ver notas sin materia"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 text-lg opacity-60">
                  <StickyNote size={18} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">Sin materia</span>
                  <span className="text-[11px] opacity-50">
                    {noneCount} nota{noneCount === 1 ? '' : 's'} sin etiquetar
                  </span>
                </div>
                <ChevronRight size={16} className="opacity-40 shrink-0" />
              </button>
            )}
          </>
        )}
      </main>

      <BottomNav />

      {modal.kind === 'create' && (
        <SubjectFormModal
          onCancel={() => setModal({ kind: 'closed' })}
          submitting={createMut.isPending}
          onSubmit={async (input) => {
            await createMut.mutateAsync(input)
            setModal({ kind: 'closed' })
          }}
        />
      )}

      {modal.kind === 'edit' && (
        <SubjectFormModal
          initial={modal.subject}
          onCancel={() => setModal({ kind: 'closed' })}
          submitting={updateMut.isPending}
          onSubmit={async (input) => {
            await updateMut.mutateAsync({ id: modal.subject.id, input })
            setModal({ kind: 'closed' })
          }}
        />
      )}

      {modal.kind === 'delete' && (
        <ConfirmDelete
          subject={modal.subject}
          submitting={deleteMut.isPending}
          onCancel={() => setModal({ kind: 'closed' })}
          onConfirm={async () => {
            await deleteMut.mutateAsync(modal.subject.id)
            setModal({ kind: 'closed' })
          }}
        />
      )}
    </div>
  )
}

function ConfirmDelete({
  subject,
  onConfirm,
  onCancel,
  submitting,
}: {
  subject: SubjectRecord
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  submitting: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4 shadow-xl"
        style={{
          background: 'var(--color-background, #ffffff)',
          color: 'var(--color-foreground, #0a0a0a)',
        }}
      >
        <h2 className="text-lg font-semibold text-center">¿Eliminar esta materia?</h2>
        <p className="text-sm opacity-70 text-center">
          Las sesiones que ya tenías etiquetadas como <strong>{subject.name}</strong> mantendrán
          la etiqueta en el histórico, pero ya no podrás aplicarla a nuevas sesiones.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border font-medium"
            style={{ borderColor: 'rgba(127,127,127,0.3)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-60"
            style={{ background: '#dc2626' }}
          >
            {submitting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
