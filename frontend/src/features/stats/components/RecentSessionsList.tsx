// RecentSessionsList.tsx — last 10 completed sessions, click to view/edit notes.
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { StickyNote, ChevronRight } from 'lucide-react'
import { listRecentSessions, type SessionSummary } from '@/features/timer/api/sessions'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'Hoy'
  if (sameDay(d, yesterday)) return 'Ayer'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
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

export function RecentSessionsList() {
  const navigate = useNavigate()
  const subjectsQuery = useSubjects()

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['stats', 'recent-sessions'],
    queryFn: () => listRecentSessions(10),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <li
            key={i}
            className="h-16 rounded-xl bg-current/5 animate-pulse"
          />
        ))}
      </ul>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <p className="text-sm opacity-50 italic">
        Cuando termines una sesión, aparecerá acá con tus notas.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((s) => {
        const subject = s.subjectId
          ? subjectsQuery.data?.find((x) => x.id === s.subjectId)
          : null
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => navigate(`/timer/summary/${s.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-current/5 hover:bg-current/10 active:bg-current/15 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold tabular-nums">
                    {formatDuration(s.durationSec)}
                  </span>
                  <span className="text-xs opacity-50">·</span>
                  <span className="text-xs opacity-60">{modeShort(s.mode)}</span>
                  {subject && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        background: `${subject.color}22`,
                        color: subject.color,
                      }}
                    >
                      {subject.emoji && <span>{subject.emoji}</span>}
                      {subject.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs opacity-50">
                  <span>{formatDay(s.startedAt)}</span>
                  <span>·</span>
                  <span>{formatTime(s.startedAt)}</span>
                  {s.notes && (
                    <>
                      <span>·</span>
                      <StickyNote size={12} />
                      <span className="truncate">{s.notes}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="opacity-40 shrink-0" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
