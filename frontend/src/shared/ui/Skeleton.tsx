// Skeleton.tsx — Pulsing placeholder for loading states
// Use in place of content while data is being fetched.
interface SkeletonProps {
  /** CSS width (e.g. "100%", "12rem") — defaults to "100%" */
  width?: string
  /** CSS height (e.g. "1rem", "3rem") — defaults to "1rem" */
  height?: string
  /** Additional Tailwind classes */
  className?: string
}

export function Skeleton({ width = '100%', height = '1rem', className = '' }: SkeletonProps) {
  return (
    <div
      role="presentation"
      className={['rounded-lg bg-current/10 animate-pulse', className].join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}
