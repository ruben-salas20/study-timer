// TimerRing.tsx — circular progress ring around the active timer.
// Smoothly animates the stroke offset as time elapses.

interface TimerRingProps {
  /** 0..1 — fraction of total elapsed (1 = full / completed) */
  progress: number
  /** Visual diameter in px */
  size?: number
  /** Stroke width in px */
  stroke?: number
  /** Children rendered in the center (e.g. the digits) */
  children?: React.ReactNode
}

export function TimerRing({
  progress,
  size = 280,
  stroke = 8,
  children,
}: TimerRingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)))

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
