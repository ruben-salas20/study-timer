// GoalStep.tsx — T19
// Weekly study goal selector — range input + preset chips.
// Layout ref: hifi-screens-1.jsx HFGoal
// Colors use CSS variables only — no hardcoded sage (RISK-6).
import { useState } from 'react'

interface GoalStepProps {
  onNext: (minutes: number) => void
  goalError?: string | null
}

const PRESETS = [
  { label: '5h', minutes: 300 },
  { label: '10h', minutes: 600 },
  { label: '15h', minutes: 900 },
  { label: '25h', minutes: 1500 },
  { label: '40h', minutes: 2400 },
]

function formatGoal(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function GoalStep({ onNext, goalError }: GoalStepProps) {
  const [minutes, setMinutes] = useState(600)

  return (
    <div className="flex flex-col flex-1 px-6 pt-2 pb-10">
      <h1 className="text-2xl font-bold mb-1">Tu meta semanal</h1>
      <p className="text-sm opacity-60 mb-6">siempre puedes cambiarla luego</p>

      {/* Goal display card */}
      <div className="rounded-2xl bg-(--color-primary)/10 p-7 text-center mb-6">
        <p className="text-xs uppercase tracking-widest font-semibold opacity-60 mb-2">
          meta
        </p>
        <div className="flex items-baseline justify-center gap-2 mb-4">
          <span className="text-7xl font-bold leading-none">
            {formatGoal(minutes)}
          </span>
          <span className="text-xl opacity-60">/ sem</span>
        </div>

        {/* Range slider */}
        <input
          type="range"
          min={30}
          max={4200}
          step={30}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-full accent-(--color-primary)"
          aria-label={`Meta semanal: ${formatGoal(minutes)}`}
        />
        <p className="text-xs opacity-50 mt-2">desliza para ajustar</p>
      </div>

      {/* Preset chips */}
      <p className="text-xs uppercase tracking-widest font-semibold opacity-60 mb-3">
        presets
      </p>
      <div className="flex gap-2 flex-wrap mb-6">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setMinutes(preset.minutes)}
            className={[
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              minutes === preset.minutes
                ? 'bg-(--color-primary) text-white border-(--color-primary)'
                : 'border-current/30 opacity-70',
            ].join(' ')}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Validation error */}
      {goalError && (
        <p role="alert" className="text-sm text-red-500 mb-4">
          {goalError}
        </p>
      )}

      <button
        type="button"
        onClick={() => onNext(minutes)}
        className="w-full py-3 px-6 rounded-xl font-semibold text-base bg-(--color-primary) text-white mt-auto"
      >
        Continuar
      </button>
    </div>
  )
}
