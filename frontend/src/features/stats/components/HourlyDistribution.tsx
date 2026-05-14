// HourlyDistribution.tsx — 24-hour activity histogram + "best hour" highlight.
// Each bar represents the total durationSec spent starting in that local hour
// across the whole stats window (366 days).
import type { ReactNode } from 'react'

function formatTotal(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatHourRange(start: number, end: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(start)}:00 – ${pad(end)}:00`
}

interface HourlyDistributionProps {
  /** 24 entries indexed by hour-of-day in the user's local tz. */
  buckets: number[]
  /** Best contiguous range — null if no activity at all. */
  best: { startHour: number; endHour: number; totalSec: number } | null
}

export function HourlyDistribution({ buckets, best }: HourlyDistributionProps) {
  const max = Math.max(...buckets, 1)
  const totalAcrossDay = buckets.reduce((acc, s) => acc + s, 0)

  if (totalAcrossDay === 0) {
    return (
      <p className="text-sm opacity-50 italic">
        Aún sin sesiones para detectar tus horas más productivas.
      </p>
    )
  }

  // Render the headline + the bars below.
  let headline: ReactNode = null
  if (best) {
    headline = (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs uppercase tracking-widest opacity-60 font-semibold">
          Tu mejor hora
        </span>
        <span className="text-base font-semibold">
          {formatHourRange(best.startHour, best.endHour)}
        </span>
        <span className="text-xs opacity-50">
          {formatTotal(best.totalSec)} acumulados en esa franja
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {headline}
      <div
        className="flex items-end gap-[2px] h-20"
        role="img"
        aria-label="Histograma de actividad por hora del día"
      >
        {buckets.map((sec, hour) => {
          const isBest = best && hour === best.startHour
          const heightPct = max > 0 ? Math.max(2, (sec / max) * 100) : 2
          return (
            <div
              key={hour}
              className="flex-1 min-w-0 rounded-t-sm transition-colors"
              style={{
                height: `${heightPct}%`,
                background: isBest
                  ? 'var(--color-primary)'
                  : sec > 0
                    ? 'color-mix(in srgb, var(--color-primary) 35%, transparent)'
                    : 'rgba(127,127,127,0.15)',
              }}
              title={`${hour.toString().padStart(2, '0')}:00 — ${formatTotal(sec)}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] opacity-50 tabular-nums">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  )
}
