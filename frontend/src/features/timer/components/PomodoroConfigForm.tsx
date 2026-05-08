// PomodoroConfigForm.tsx — Pomodoro configuration form using WheelPicker.
// Fields: workMin (1-90), breakMin (1-60), cycles (1-12)
import { useState } from 'react'
import { WheelPicker } from '@/shared/ui/WheelPicker'
import type { PomodoroConfig } from '../schemas'

interface PomodoroConfigFormProps {
  defaultValues?: Partial<PomodoroConfig>
  onSubmit: (data: PomodoroConfig) => void
  onCancel?: () => void
}

const WORK_VALUES = Array.from({ length: 90 }, (_, i) => i + 1) // 1..90
const BREAK_VALUES = Array.from({ length: 60 }, (_, i) => i + 1) // 1..60
const CYCLE_VALUES = Array.from({ length: 12 }, (_, i) => i + 1) // 1..12

export function PomodoroConfigForm({
  defaultValues,
  onSubmit,
  onCancel,
}: PomodoroConfigFormProps) {
  const [workMin, setWorkMin] = useState(defaultValues?.workMin ?? 25)
  const [breakMin, setBreakMin] = useState(defaultValues?.breakMin ?? 5)
  const [cycles, setCycles] = useState(defaultValues?.cycles ?? 4)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ workMin, breakMin, cycles })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1">
          <label className="text-xs uppercase tracking-widest opacity-60">
            Trabajo
          </label>
          <WheelPicker
            values={WORK_VALUES}
            value={workMin}
            onChange={setWorkMin}
            suffix="min"
            ariaLabel="Minutos de trabajo"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <label className="text-xs uppercase tracking-widest opacity-60">
            Descanso
          </label>
          <WheelPicker
            values={BREAK_VALUES}
            value={breakMin}
            onChange={setBreakMin}
            suffix="min"
            ariaLabel="Minutos de descanso"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <label className="text-xs uppercase tracking-widest opacity-60">
            Ciclos
          </label>
          <WheelPicker
            values={CYCLE_VALUES}
            value={cycles}
            onChange={setCycles}
            ariaLabel="Cantidad de ciclos"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-current/30 font-medium text-base opacity-70"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-(--color-primary) text-white font-semibold text-base"
        >
          Iniciar
        </button>
      </div>
    </form>
  )
}
