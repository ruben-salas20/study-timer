// DateTimePicker.tsx — date input + iOS-style wheel pickers for hour/minute.
// Outputs an ISO local datetime string ("YYYY-MM-DDTHH:mm") that the parent
// can feed into `new Date(...)` to convert to UTC for the backend.
//
// Why split date and time:
// - Native <input type="datetime-local"> renders inconsistently across mobile
//   browsers (some hide minutes, some force seconds, some pop a tiny modal).
// - A native date picker is solid for the date and the wheel pickers are
//   coherent with the rest of the timer UI.
import { WheelPicker } from './WheelPicker'

interface DateTimePickerProps {
  /** Current value as "YYYY-MM-DDTHH:mm" (local). */
  value: string
  onChange: (next: string) => void
  /** Optional minimum date (YYYY-MM-DD) for the date input. */
  minDate?: string
  ariaLabelDate?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,10,...,55

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function parse(value: string): { date: string; hour: number; minute: number } {
  if (!value) {
    const now = new Date()
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      hour: now.getHours(),
      // Snap to nearest 5-min slot
      minute: Math.round(now.getMinutes() / 5) * 5,
    }
  }
  const [date, time] = value.split('T')
  const [h, m] = (time ?? '00:00').split(':').map((n) => Number(n))
  return { date, hour: h ?? 0, minute: m ?? 0 }
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  ariaLabelDate,
}: DateTimePickerProps) {
  const { date, hour, minute } = parse(value)

  function emit(next: { date?: string; hour?: number; minute?: number }) {
    const d = next.date ?? date
    const h = next.hour ?? hour
    const m = next.minute ?? minute
    onChange(`${d}T${pad(h)}:${pad(m)}`)
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="date"
        value={date}
        min={minDate}
        onChange={(e) => emit({ date: e.target.value })}
        aria-label={ariaLabelDate}
        className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-(--color-primary) appearance-none"
      />

      <div className="flex items-end justify-center gap-1 text-foreground">
        <div className="flex flex-col items-center gap-1 w-20">
          <label className="text-[10px] uppercase tracking-widest opacity-60">Hora</label>
          <WheelPicker
            values={HOURS}
            value={hour}
            onChange={(h) => emit({ hour: h })}
            ariaLabel="Hora"
          />
        </div>
        <div className="text-3xl font-bold opacity-40 pb-[88px]">:</div>
        <div className="flex flex-col items-center gap-1 w-20">
          <label className="text-[10px] uppercase tracking-widest opacity-60">Min</label>
          <WheelPicker
            values={MINUTES}
            value={minute}
            onChange={(m) => emit({ minute: m })}
            ariaLabel="Minutos"
          />
        </div>
      </div>
    </div>
  )
}
