// DayBarChart.tsx — Minimal inline SVG bar chart for daily study minutes.
// Pure presentational component — no state, no effects.
// Uses CSS var (--color-accent via --color-primary) so bars follow the active accent.
//
// Props:
//   data   — array of { date: YYYY-MM-DD, sec: number }
//   maxSec — the reference maximum to scale bar heights (usually the max over the dataset)

const CHART_HEIGHT = 80   // px — bar area height
const BAR_WIDTH = 12      // px — each bar width
const GAP = 4             // px — gap between bars

interface DayBarDatum {
  date: string
  sec: number
}

interface DayBarChartProps {
  data: DayBarDatum[]
  maxSec: number
}

export function DayBarChart({ data, maxSec }: DayBarChartProps) {
  const totalWidth = data.length * (BAR_WIDTH + GAP)

  return (
    <svg
      role="img"
      aria-label="Gráfico de minutos por día"
      width={totalWidth}
      height={CHART_HEIGHT}
      viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT}`}
      overflow="visible"
    >
      {data.map((datum, i) => {
        const barHeight = maxSec > 0 ? Math.round((datum.sec / maxSec) * CHART_HEIGHT) : 0
        const x = i * (BAR_WIDTH + GAP)
        const y = CHART_HEIGHT - barHeight

        return (
          <rect
            key={datum.date}
            x={x}
            y={y}
            width={BAR_WIDTH}
            height={barHeight}
            rx={2}
            fill="var(--color-primary)"
            opacity={0.85}
          />
        )
      })}
    </svg>
  )
}
