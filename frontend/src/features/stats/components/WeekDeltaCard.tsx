// WeekDeltaCard.tsx — "esta semana vs anterior" card with absolute totals
// + percent change. Hides the delta line when last week was zero (no
// baseline to compare against).
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { WeekDelta } from '../lib/aggregators'

function formatMinutes(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

interface WeekDeltaCardProps {
  data: WeekDelta
}

export function WeekDeltaCard({ data }: WeekDeltaCardProps) {
  const { thisWeekSec, lastWeekSec, deltaPct } = data
  const positive = deltaPct !== null && deltaPct > 0
  const negative = deltaPct !== null && deltaPct < 0
  const flat = deltaPct === 0

  const accent = positive ? '#84a98c' : negative ? '#dc2626' : 'currentColor'
  const Arrow = positive ? TrendingUp : negative ? TrendingDown : Minus

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-4"
      style={{
        borderColor: deltaPct !== null ? `${accent}55` : 'rgba(127,127,127,0.25)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest opacity-60 font-semibold">
          Esta semana
        </span>
        {deltaPct !== null && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: accent }}
          >
            <Arrow size={14} />
            {flat ? '0%' : `${positive ? '+' : ''}${deltaPct}%`}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-2xl font-bold tabular-nums">
          {formatMinutes(thisWeekSec)}
        </span>
        <span className="text-xs opacity-50">
          vs {formatMinutes(lastWeekSec)} la semana pasada
        </span>
      </div>
      {deltaPct === null && (
        <span className="text-[11px] opacity-50 italic">
          La semana pasada no hubo sesiones; sin base para comparar.
        </span>
      )}
    </div>
  )
}
