// ActiveSessionPage.tsx — Full-screen active timer display
// Shows the running timer with play/pause/stop controls.
// On stop: confirm modal → navigate back to /home.
// Modo Focus is a visual-only toggle in F2.
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, Square, Focus } from 'lucide-react'
import { useTimer } from '../hooks/useTimer'
import { TimerDisplay } from '../components/TimerDisplay'
import { TimerRing } from '../components/TimerRing'

function ConfirmStopModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-stop-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
        style={{
          background: 'var(--color-background, #ffffff)',
          color: 'var(--color-foreground, #0a0a0a)',
        }}
      >
        <h2 id="confirm-stop-title" className="text-lg font-semibold text-center">
          ¿Terminar sesión?
        </h2>
        <p className="text-sm opacity-70 text-center">
          Se guardará el progreso hasta este momento.
        </p>
        <div className="flex gap-3">
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
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-white font-semibold"
            style={{ background: '#dc2626' }}
          >
            Terminar
          </button>
        </div>
      </div>
    </div>
  )
}

export function ActiveSessionPage() {
  const navigate = useNavigate()
  const { status, mode, elapsedSec, remainingSec, currentCycle, pomodoroPhase, isPaused, pause, resume, stop } =
    useTimer()

  const [showConfirmStop, setShowConfirmStop] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [pulse, setPulse] = useState(false)
  const ringRef = useRef<HTMLDivElement>(null)

  // Trigger pulse animation when pomodoro phase changes
  const prevPhase = useRef(pomodoroPhase)
  useEffect(() => {
    if (prevPhase.current !== pomodoroPhase && mode === 'pomodoro') {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 700)
      prevPhase.current = pomodoroPhase
      return () => clearTimeout(t)
    }
    prevPhase.current = pomodoroPhase
  }, [pomodoroPhase, mode])

  // If there's no active session (e.g., direct URL access), go back
  if (status === 'idle') {
    navigate('/home', { replace: true })
    return null
  }

  // Displayed seconds: countdown shows remaining, stopwatch shows elapsed
  const displaySec = mode === 'stopwatch' ? elapsedSec : remainingSec

  // Progress 0..1 for the ring. Stopwatch has no natural end → no ring.
  const phaseTotal = elapsedSec + remainingSec
  const progress = phaseTotal > 0 ? elapsedSec / phaseTotal : 0
  const showRing = mode === 'pomodoro' || mode === 'countdown'

  const modeLabel =
    mode === 'pomodoro'
      ? `Pomodoro · Ciclo ${currentCycle} · ${pomodoroPhase === 'work' ? 'Trabajo' : 'Descanso'}`
      : mode === 'countdown'
        ? 'Cuenta regresiva'
        : 'Cronómetro'

  async function handleStop() {
    await stop()
    navigate('/home')
  }

  return (
    <div
      className={[
        'flex flex-col items-center justify-between min-h-screen bg-background text-foreground px-6',
        'py-safe',
        isFocusMode ? 'bg-black text-white' : '',
      ].join(' ')}
    >
      {/* Top bar */}
      <header className="w-full flex items-center justify-between pt-12 pb-4">
        <span className="text-sm opacity-60 font-medium">{modeLabel}</span>
        <button
          type="button"
          onClick={() => setIsFocusMode((v) => !v)}
          title="Modo Focus (visual)"
          className={[
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border',
            isFocusMode
              ? 'border-white/30 text-white/80'
              : 'border-current/20 opacity-50',
          ].join(' ')}
        >
          <Focus size={13} />
          Focus
        </button>
      </header>

      {/* Timer display */}
      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
        <div ref={ringRef} className={pulse ? 'phase-pulse rounded-full' : ''}>
          {showRing ? (
            <TimerRing progress={progress} size={280} stroke={8}>
              <TimerDisplay
                seconds={displaySec}
                className="text-7xl font-bold tracking-tight"
              />
            </TimerRing>
          ) : (
            <TimerDisplay
              seconds={displaySec}
              className="text-8xl font-bold tracking-tight"
            />
          )}
        </div>
        {status === 'paused' && (
          <span className="text-sm opacity-60 uppercase tracking-widest">
            Pausado
          </span>
        )}
        {status === 'completed' && (
          <span className="text-sm text-(--color-primary) uppercase tracking-widest font-semibold">
            Completado
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 pb-16">
        {/* Stop */}
        <button
          type="button"
          onClick={() => setShowConfirmStop(true)}
          className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-current/30 opacity-70"
          aria-label="Detener sesión"
        >
          <Square size={20} />
        </button>

        {/* Pause / Resume */}
        {status !== 'completed' && (
          <button
            type="button"
            onClick={isPaused ? resume : pause}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-(--color-primary) text-white shadow-lg"
            aria-label={isPaused ? 'Reanudar' : 'Pausar'}
          >
            {isPaused ? <Play size={32} fill="white" /> : <Pause size={32} />}
          </button>
        )}
      </div>

      {/* Confirm stop modal */}
      {showConfirmStop && (
        <ConfirmStopModal
          onConfirm={handleStop}
          onCancel={() => setShowConfirmStop(false)}
        />
      )}
    </div>
  )
}
