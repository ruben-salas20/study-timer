// TimerDisplay.tsx — Formats a seconds count into MM:SS or HH:MM:SS
// Under 1 hour: MM:SS (e.g., "04:30")
// 1 hour or more: HH:MM:SS (e.g., "01:04:30")
interface TimerDisplayProps {
  seconds: number
  className?: string
}

/** Format seconds as MM:SS (under 1h) or HH:MM:SS (1h+) */
function formatSeconds(totalSeconds: number): string {
  const abs = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60

  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')

  if (h > 0) {
    const hh = String(h).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  return `${mm}:${ss}`
}

export function TimerDisplay({ seconds, className }: TimerDisplayProps) {
  return (
    <span
      className={`font-mono tabular-nums${className ? ` ${className}` : ''}`}
      aria-label={`${seconds} seconds`}
      aria-live="polite"
    >
      {formatSeconds(seconds)}
    </span>
  )
}
