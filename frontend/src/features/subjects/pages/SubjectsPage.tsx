// SubjectsPage.tsx — manage user's subjects (create / edit / delete).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useCreateSubject,
  useDeleteSubject,
  useSubjects,
  useUpdateSubject,
} from '../hooks/useSubjects'
import { SubjectFormModal } from '../components/SubjectFormModal'
import type { SubjectRecord } from '../api/subjects'
import { BottomNav } from '@/shared/ui/BottomNav'

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
          subjects.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
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
                <span className="text-[11px] opacity-40 tabular-nums">{s.color}</span>
              </div>
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
          ))
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
