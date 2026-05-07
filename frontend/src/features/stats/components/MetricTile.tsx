// MetricTile.tsx — Small stat card showing a label + formatted value.

interface MetricTileProps {
  label: string
  value: string
  /** Optional sub-label (e.g. date for best day) */
  sub?: string
}

export function MetricTile({ label, value, sub }: MetricTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-current/5 p-4 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-widest opacity-50 truncate">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums text-(--color-primary) leading-tight">
        {value}
      </span>
      {sub && (
        <span className="text-xs opacity-40 truncate">{sub}</span>
      )}
    </div>
  )
}
