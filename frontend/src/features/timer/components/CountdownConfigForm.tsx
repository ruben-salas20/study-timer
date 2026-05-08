// CountdownConfigForm.tsx — Countdown configuration form using WheelPicker.
// Field: targetMin (1-180)
import { useState } from 'react'
import { WheelPicker } from '@/shared/ui/WheelPicker'
import type { CountdownConfig } from '../schemas'

interface CountdownConfigFormProps {
  defaultValues?: Partial<CountdownConfig>
  onSubmit: (data: CountdownConfig) => void
  onCancel?: () => void
}

const MINUTE_VALUES = Array.from({ length: 180 }, (_, i) => i + 1) // 1..180

export function CountdownConfigForm({
  defaultValues,
  onSubmit,
  onCancel,
}: CountdownConfigFormProps) {
  const [targetMin, setTargetMin] = useState(defaultValues?.targetMin ?? 45)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ targetMin })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1">
        <label className="text-xs uppercase tracking-widest opacity-60">
          Duración
        </label>
        <WheelPicker
          values={MINUTE_VALUES}
          value={targetMin}
          onChange={setTargetMin}
          suffix="min"
          ariaLabel="Duración en minutos"
        />
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
