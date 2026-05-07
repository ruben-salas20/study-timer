// CountdownConfigForm.tsx — Countdown configuration form (RHF + Zod)
// Field: targetMin (1-180)
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { countdownConfigSchema, type CountdownConfig } from '../schemas'

interface CountdownConfigFormProps {
  defaultValues?: Partial<CountdownConfig>
  onSubmit: (data: CountdownConfig) => void
  onCancel?: () => void
}

export function CountdownConfigForm({
  defaultValues,
  onSubmit,
  onCancel,
}: CountdownConfigFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CountdownConfig>({
    resolver: zodResolver(countdownConfigSchema),
    defaultValues: {
      targetMin: defaultValues?.targetMin ?? 45,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="targetMin" className="text-sm font-medium">
          Duración (minutos)
        </label>
        <input
          id="targetMin"
          type="number"
          min={1}
          max={180}
          {...register('targetMin', { valueAsNumber: true })}
          className="rounded-xl border border-current/20 bg-(--color-surface-raised) px-4 py-2.5 text-base"
        />
        {errors.targetMin && (
          <p className="text-xs text-red-500">{errors.targetMin.message}</p>
        )}
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
