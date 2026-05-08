// HomeTimerPage.tsx — Main home page with timer mode selection
// Replaces the placeholder HomePage for authenticated users.
// Three mode tiles: Pomodoro, Cronómetro (stopwatch), Regresivo (countdown)
// Config modal appears inline after tile selection.
// Stats strip: today's study time + week progress toward weeklyGoalMinutes.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, Clock, RotateCcw } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useTimer } from '../hooks/useTimer'
import { ModeCard } from '../components/ModeCard'
import { PomodoroConfigForm } from '../components/PomodoroConfigForm'
import { CountdownConfigForm } from '../components/CountdownConfigForm'
import { useStats } from '@/features/stats/hooks/useStats'
import { BottomNav } from '@/shared/ui/BottomNav'
import type { PomodoroConfig, CountdownConfig } from '../schemas'

type ModeSelection = 'pomodoro' | 'stopwatch' | 'countdown' | null

export function HomeTimerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { start } = useTimer()
  // Same source of truth as the Stats page — derives today/week from a single
  // 90-day session fetch. Avoids the divergence we had with a separate hook.
  const { todaySec, weekSec } = useStats(user?.timezone as string ?? 'UTC')

  const [selectedMode, setSelectedMode] = useState<ModeSelection>(null)

  const weeklyGoalSec = (user?.weeklyGoalMinutes ?? 600) * 60
  const weekProgressPercent = Math.min(100, Math.round((weekSec / weeklyGoalSec) * 100))

  function formatMinutes(totalSec: number): string {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  async function handleStartStopwatch() {
    await start('stopwatch')
    navigate('/timer/active')
  }

  async function handleStartPomodoro(config: PomodoroConfig) {
    await start('pomodoro', { pomodoroConfig: config })
    navigate('/timer/active')
  }

  async function handleStartCountdown(config: CountdownConfig) {
    await start('countdown', { targetSec: config.targetMin * 60 })
    navigate('/timer/active')
  }

  const greeting = user?.displayName
    ? `Hola, ${String(user.displayName).split(' ')[0]}`
    : 'Bienvenido'

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-50 mb-0.5">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </p>
          <h1 className="text-2xl font-bold">{greeting}</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/me')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-(--color-primary) text-white font-semibold text-lg"
          aria-label="Ir a mi perfil"
          title="Mi perfil"
        >
          {user?.displayName ? String(user.displayName)[0].toUpperCase() : '?'}
        </button>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-4 gap-5">
        {/* Stats strip */}
        <div className="rounded-2xl bg-(--color-surface-raised) px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest opacity-50">Hoy</span>
            <span className="font-semibold text-sm">{formatMinutes(todaySec)}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-60">Meta semanal</span>
              <span className="text-xs opacity-60">
                {formatMinutes(weekSec)} / {formatMinutes(weeklyGoalSec)} ({weekProgressPercent}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-current/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-(--color-primary) transition-all duration-500"
                style={{ width: `${weekProgressPercent}%` }}
                role="progressbar"
                aria-valuenow={weekProgressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>

        {/* Mode selection */}
        {selectedMode == null && (
          <>
            <h2 className="text-sm uppercase tracking-widest opacity-50 -mb-2">
              Selecciona un modo
            </h2>
            <div className="flex flex-col gap-3">
              <ModeCard
                title="Pomodoro"
                description="Intervalos de trabajo y descanso"
                icon={<Timer size={24} />}
                onClick={() => setSelectedMode('pomodoro')}
              />
              <ModeCard
                title="Cronómetro"
                description="Cuenta libre sin límite de tiempo"
                icon={<Clock size={24} />}
                onClick={handleStartStopwatch}
              />
              <ModeCard
                title="Cuenta regresiva"
                description="Fija tu objetivo de tiempo"
                icon={<RotateCcw size={24} />}
                onClick={() => setSelectedMode('countdown')}
              />
            </div>
          </>
        )}

        {/* Pomodoro config */}
        {selectedMode === 'pomodoro' && (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-lg">Configurar Pomodoro</h2>
            <PomodoroConfigForm
              onSubmit={handleStartPomodoro}
              onCancel={() => setSelectedMode(null)}
            />
          </div>
        )}

        {/* Countdown config */}
        {selectedMode === 'countdown' && (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-lg">Configurar cuenta regresiva</h2>
            <CountdownConfigForm
              onSubmit={handleStartCountdown}
              onCancel={() => setSelectedMode(null)}
            />
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
