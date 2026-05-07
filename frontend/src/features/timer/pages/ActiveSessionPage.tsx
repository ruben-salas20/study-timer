// ActiveSessionPage.tsx — Full-screen active timer display
// Shows the running timer with play/pause/stop controls.
// On stop: confirm modal → navigate back to /home.
// Modo Focus is a visual-only toggle in F2.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, Square, Focus } from 'lucide-react'
import { useTimer } from '../hooks/useTimer'
import { TimerDisplay } from '../components/TimerDisplay'

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
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 flex flex-col gap-5 shadow-xl">
        <h2 id="confirm-stop-title" className="text-lg font-semibold text-center">
          ¿Terminar sesión?
        </h2>
        <p className="text-sm opacity-60 text-center">
          Se guardará el progreso hasta este momento.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-current/30 font-medium opacity-70"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold"
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
  const { status, mode, elapsedSec, remainingSec, currentCycle, isPaused, pause, resume, stop } =
    useTimer()

  const [showConfirmStop, setShowConfirmStop] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)

  // If there's no active session (e.g., direct URL access), go back
  if (status === 'idle') {
    navigate('/home', { replace: true })
    return null
  }

  // Displayed seconds: countdown shows remaining, stopwatch shows elapsed
  const displaySec = mode === 'stopwatch' ? elapsedSec : remainingSec

  const modeLabel =
    mode === 'pomodoro'
      ? `Pomodoro · Ciclo ${currentCycle}`
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
        <TimerDisplay
          seconds={displaySec}
          className="text-8xl font-bold tracking-tight"
        />
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
