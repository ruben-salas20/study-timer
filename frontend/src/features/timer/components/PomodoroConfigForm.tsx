// PomodoroConfigForm.tsx — Pomodoro configuration form (RHF + Zod)
// Fields: workMin (1-90), breakMin (1-60), cycles (1-12)
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pomodoroConfigSchema, type PomodoroConfig } from '../schemas'

interface PomodoroConfigFormProps {
  defaultValues?: Partial<PomodoroConfig>
  onSubmit: (data: PomodoroConfig) => void
  onCancel?: () => void
}

export function PomodoroConfigForm({
  defaultValues,
  onSubmit,
  onCancel,
}: PomodoroConfigFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PomodoroConfig>({
    resolver: zodResolver(pomodoroConfigSchema),
    defaultValues: {
      workMin: defaultValues?.workMin ?? 25,
      breakMin: defaultValues?.breakMin ?? 5,
      cycles: defaultValues?.cycles ?? 4,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="workMin" className="text-sm font-medium">
          Trabajo (minutos)
        </label>
        <input
          id="workMin"
          type="number"
          min={1}
          max={90}
          {...register('workMin', { valueAsNumber: true })}
          className="rounded-xl border border-current/20 bg-(--color-surface-raised) px-4 py-2.5 text-base"
        />
        {errors.workMin && (
          <p className="text-xs text-red-500">{errors.workMin.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="breakMin" className="text-sm font-medium">
          Descanso (minutos)
        </label>
        <input
          id="breakMin"
          type="number"
          min={1}
          max={60}
          {...register('breakMin', { valueAsNumber: true })}
          className="rounded-xl border border-current/20 bg-(--color-surface-raised) px-4 py-2.5 text-base"
        />
        {errors.breakMin && (
          <p className="text-xs text-red-500">{errors.breakMin.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cycles" className="text-sm font-medium">
          Ciclos
        </label>
        <input
          id="cycles"
          type="number"
          min={1}
          max={12}
          {...register('cycles', { valueAsNumber: true })}
          className="rounded-xl border border-current/20 bg-(--color-surface-raised) px-4 py-2.5 text-base"
        />
        {errors.cycles && (
          <p className="text-xs text-red-500">{errors.cycles.message}</p>
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
