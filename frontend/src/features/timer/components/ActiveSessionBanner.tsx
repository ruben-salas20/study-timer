// ActiveSessionBanner.tsx — prominent card on /home that surfaces an
// in-progress (or paused) study session so the user can never lose it after
// closing the app or accidentally navigating away from /timer/active.
//
// The banner intentionally hides the mode selector (handled by the parent)
// to prevent the user from starting a NEW session and orphaning the open
// one in the database.
import { useNavigate } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { useTimer } from '../hooks/useTimer'
import { TimerDisplay } from './TimerDisplay'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { SubjectChip } from '@/features/subjects/components/SubjectChip'
import { useEffect, useState } from 'react'
import pb from '@/shared/pb'

export function ActiveSessionBanner() {
  const navigate = useNavigate()
  const { status, mode, elapsedSec, remainingSec, currentCycle, pomodoroPhase } = useTimer()
  const { data: subjects = [] } = useSubjects()
  const [subjectId, setSubjectId] = useState<string | null>(null)

  // Read the current session's subject id from the API once we know which
  // session is active. The store doesn't carry it (the store is mode-focused).
  const sessionId = useTimer().sessionId
  useEffect(() => {
    let cancelled = false
    if (!sessionId) {
      setSubjectId(null)
      return
    }
    void pb
      .collection('study_sessions')
      .getOne(sessionId)
      .then((r) => {
        if (cancelled) return
        const sid = (r['subject'] as string | undefined) || null
        setSubjectId(sid)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (status !== 'running' && status !== 'paused') return null

  const subject = subjectId ? subjects.find((s) => s.id === subjectId) : null
  const displaySec = mode === 'stopwatch' ? elapsedSec : remainingSec

  const modeLabel =
    mode === 'pomodoro'
      ? `Pomodoro · Ciclo ${currentCycle} · ${pomodoroPhase === 'work' ? 'Trabajo' : 'Descanso'}`
      : mode === 'countdown'
        ? 'Cuenta regresiva'
        : 'Cronómetro'

  const isPaused = status === 'paused'

  return (
    <button
      type="button"
      onClick={() => navigate('/timer/active')}
      className="w-full text-left rounded-2xl p-5 flex flex-col gap-3 transition-all hover:scale-[1.005]"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in oklch, var(--color-primary) 22%, transparent), color-mix(in oklch, var(--color-primary) 8%, transparent))',
        border: '1px solid color-mix(in oklch, var(--color-primary) 40%, transparent)',
      }}
      aria-label="Volver al timer activo"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center justify-center w-7 h-7 rounded-full',
              isPaused ? 'bg-white/10' : 'bg-(--color-primary) text-white',
            ].join(' ')}
          >
            {isPaused ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
          </span>
          <span className="text-xs uppercase tracking-widest opacity-70">
            {isPaused ? 'Sesión pausada' : 'Sesión activa'}
          </span>
        </div>
        <span className="text-xs opacity-60">Volver al timer →</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs opacity-60 truncate">{modeLabel}</span>
          {subject && <SubjectChip subject={subject} />}
        </div>
        <TimerDisplay
          seconds={displaySec}
          className="text-3xl font-bold tracking-tight tabular-nums"
        />
      </div>
    </button>
  )
}
