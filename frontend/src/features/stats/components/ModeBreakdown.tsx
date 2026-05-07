// ModeBreakdown.tsx — Horizontal bars showing time per timer mode.
// Pure presentational component.

interface ModeBySeconds {
  pomodoro: number
  stopwatch: number
  countdown: number
}

interface ModeBreakdownProps {
  byMode: ModeBySeconds
}

interface ModeRow {
  key: keyof ModeBySeconds
  label: string
}

const MODES: ModeRow[] = [
  { key: 'pomodoro', label: 'Pomodoro' },
  { key: 'stopwatch', label: 'Cronómetro' },
  { key: 'countdown', label: 'Regresivo' },
]

function fmtPct(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

export function ModeBreakdown({ byMode }: ModeBreakdownProps) {
  const total = byMode.pomodoro + byMode.stopwatch + byMode.countdown

  return (
    <div className="flex flex-col gap-3">
      {MODES.map(({ key, label }) => {
        const sec = byMode[key]
        const pct = fmtPct(sec, total)
        const pctNum = total > 0 ? Math.round((sec / total) * 100) : 0

        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="opacity-70">{label}</span>
              <span className="font-semibold tabular-nums">{pct}</span>
            </div>
            <div className="h-1.5 bg-current/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-(--color-primary) rounded-full transition-all"
                style={{ width: `${pctNum}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
