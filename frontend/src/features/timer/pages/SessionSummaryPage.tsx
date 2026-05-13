// SessionSummaryPage.tsx — Post-stop summary screen with optional notes.
// Reached via /timer/summary/:id, both right after stopping a timer AND when
// editing an old session's notes from the /stats recent-sessions list.
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Check } from 'lucide-react'
import { getSessionSummary, updateSessionNotes, type SessionSummary } from '../api/sessions'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { Skeleton } from '@/shared/ui/Skeleton'

const NOTES_MAX = 500

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function modeLabel(mode: SessionSummary['mode']): string {
  if (mode === 'pomodoro') return 'Pomodoro'
  if (mode === 'countdown') return 'Cuenta regresiva'
  return 'Cronómetro'
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SessionSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const justEnded = (location.state as { justEnded?: boolean } | null)?.justEnded === true
  const subjectsQuery = useSubjects()
  const queryClient = useQueryClient()

  const [session, setSession] = useState<SessionSummary | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      navigate('/home', { replace: true })
      return
    }
    let cancelled = false
    void (async () => {
      const data = await getSessionSummary(id)
      if (cancelled) return
      if (!data) {
        setError('No encontramos esa sesión.')
        setLoading(false)
        return
      }
      setSession(data)
      setNotes(data.notes)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const subject = useMemo(() => {
    if (!session?.subjectId) return null
    return subjectsQuery.data?.find((s) => s.id === session.subjectId) ?? null
  }, [session?.subjectId, subjectsQuery.data])

  // Edit-mode = arrived from /stats. Title becomes "Nota de sesión" and the
  // left button says "Cancelar" instead of "Saltar".
  const isEditMode = !justEnded
  const hasChanges = session ? notes.trim() !== session.notes.trim() : false

  function goBack() {
    // Just-ended sessions land at /home (fresh start). Editing from /stats
    // pops back so we don't break the user's back stack.
    if (justEnded) navigate('/home')
    else navigate(-1)
  }

  async function handleSave() {
    if (!session || !hasChanges) {
      goBack()
      return
    }
    setSaving(true)
    try {
      await updateSessionNotes(session.id, notes.trim())
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      goBack()
    } catch {
      setError('No pudimos guardar la nota. Intentá de nuevo.')
      setSaving(false)
    }
  }

  function handleSkip() {
    goBack()
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground px-6 py-safe">
        <header className="pt-10 pb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            aria-label="Volver"
            className="p-2 -ml-2"
          >
            <ChevronLeft size={22} />
          </button>
        </header>
        <main className="flex flex-col gap-4">
          <Skeleton height="8rem" />
          <Skeleton height="10rem" />
        </main>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col min-h-dvh bg-background text-foreground px-6 py-safe">
        <header className="pt-10 pb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            aria-label="Volver"
            className="p-2 -ml-2"
          >
            <ChevronLeft size={22} />
          </button>
        </header>
        <main className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4">
          <p className="text-base opacity-70">{error ?? 'Sesión no encontrada.'}</p>
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="px-4 py-2 rounded-xl bg-(--color-primary) text-white text-sm font-semibold"
          >
            Volver al inicio
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground px-6 py-safe">
      <header className="pt-10 pb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/home')}
          aria-label="Volver"
          className="p-2 -ml-2"
        >
          <ChevronLeft size={22} />
        </button>
      </header>

      <main className="flex flex-col flex-1 gap-6 pb-6">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="flex flex-col items-center text-center gap-2 pt-2">
          <span className="text-xs uppercase tracking-widest opacity-60 font-semibold">
            {isEditMode ? 'Nota de sesión' : 'Sesión completada'}
          </span>
          <h1 className="text-5xl font-bold tracking-tight tabular-nums">
            {formatDuration(session.durationSec)}
          </h1>
          <p className="text-sm opacity-60">
            {modeLabel(session.mode)} · {formatDateTime(session.startedAt)}
          </p>
          {subject && (
            <span
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: `${subject.color}22`,
                color: subject.color,
              }}
            >
              {subject.emoji && <span>{subject.emoji}</span>}
              {subject.name}
            </span>
          )}
        </section>

        {/* ── Notes ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-2">
          <label htmlFor="notes" className="text-sm font-semibold">
            ¿Algo que recordar de esta sesión?
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
            placeholder="Temas vistos, dudas, ideas..."
            rows={6}
            className="w-full rounded-xl border border-current/20 bg-transparent p-3 text-base resize-none focus:outline-none focus:border-(--color-primary)"
          />
          <p className="text-xs opacity-50 text-right tabular-nums">
            {notes.length}/{NOTES_MAX}
          </p>
        </section>

        {/* ── Actions ───────────────────────────────────────────── */}
        <section className="flex gap-3 mt-auto">
          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 py-3 rounded-xl border font-medium"
            style={{ borderColor: 'rgba(127,127,127,0.3)' }}
            disabled={saving}
          >
            {isEditMode ? 'Cancelar' : 'Saltar'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check size={18} />
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </section>
      </main>
    </div>
  )
}
