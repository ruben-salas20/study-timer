// SubjectDetailPage.tsx — notes filtered to a single subject (or the "none"
// pseudo-subject for sessions that were never tagged). Reached from
// SubjectsPage by tapping a row.
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, StickyNote } from 'lucide-react'
import { listSessionsWithNotes, type SessionSummary } from '@/features/timer/api/sessions'
import { useSubjects } from '../hooks/useSubjects'
import { BottomNav } from '@/shared/ui/BottomNav'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'

const NONE_ID = 'none'

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year:
      new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function modeShort(mode: SessionSummary['mode']): string {
  if (mode === 'pomodoro') return 'Pomodoro'
  if (mode === 'countdown') return 'Regresiva'
  return 'Cronómetro'
}

export function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const subjectsQuery = useSubjects()

  const isNone = id === NONE_ID
  const subject = useMemo(() => {
    if (isNone) return null
    return subjectsQuery.data?.find((s) => s.id === id) ?? null
  }, [id, isNone, subjectsQuery.data])

  // 404 if id doesn't match anything (and isn't the "none" sentinel) once
  // subjects finished loading.
  const subjectMissing = !isNone && !subjectsQuery.isLoading && !subject

  const { data: allNotes, isLoading } = useQuery({
    queryKey: ['notes', 'list'],
    queryFn: () => listSessionsWithNotes(),
    staleTime: 60_000,
  })

  const filtered = useMemo(() => {
    if (!allNotes) return []
    if (isNone) return allNotes.filter((n) => !n.subjectId)
    return allNotes.filter((n) => n.subjectId === id)
  }, [allNotes, id, isNone])

  const title = isNone ? 'Sin materia' : (subject?.name ?? 'Materia')
  const accentColor = isNone ? undefined : subject?.color

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="px-6 pt-10 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/subjects')}
          aria-label="Volver a Materias"
          className="p-2 -ml-2"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {!isNone && subject?.emoji && (
            <span aria-hidden="true" className="text-2xl shrink-0">{subject.emoji}</span>
          )}
          <h1
            className="text-2xl font-bold truncate"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {title}
          </h1>
        </div>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-3">
        {subjectMissing && (
          <EmptyState
            icon="❓"
            title="Materia no encontrada"
            description="Probablemente fue borrada. Volvé a la lista."
          />
        )}

        {!subjectMissing && (isLoading || subjectsQuery.isLoading) && (
          <div className="flex flex-col gap-3">
            <Skeleton height="5rem" />
            <Skeleton height="5rem" />
            <Skeleton height="5rem" />
          </div>
        )}

        {!subjectMissing && !isLoading && filtered.length === 0 && (
          <EmptyState
            icon="📝"
            title="Sin notas todavía"
            description={
              isNone
                ? 'Las notas que escribas sin etiquetar una materia aparecerán acá.'
                : `Cuando termines una sesión etiquetada como ${title} y agregues una nota, aparecerá acá.`
            }
          />
        )}

        {!subjectMissing && filtered.length > 0 && (
          <ul className="flex flex-col gap-3">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/timer/summary/${s.id}`)}
                  className="w-full text-left flex flex-col gap-2 rounded-xl border border-current/15 p-4 hover:border-(--color-primary)/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs opacity-70 flex-wrap">
                    <StickyNote size={13} className="opacity-60 shrink-0" />
                    <span>{formatDate(s.startedAt)}</span>
                    <span className="opacity-40">·</span>
                    <span>{formatTime(s.startedAt)}</span>
                    <span className="opacity-40">·</span>
                    <span className="font-semibold tabular-nums">
                      {formatDuration(s.durationSec)}
                    </span>
                    <span className="opacity-40">·</span>
                    <span>{modeShort(s.mode)}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {s.notes}
                  </p>
                  <span className="flex items-center justify-end text-xs opacity-40 -mt-1">
                    Editar <ChevronRight size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
