// SubjectChip.tsx — small visual representation of a subject (color + emoji + name).
import type { SubjectRecord } from '../api/subjects'

interface SubjectChipProps {
  subject: Pick<SubjectRecord, 'name' | 'color' | 'emoji'>
  size?: 'sm' | 'md'
  className?: string
}

export function SubjectChip({ subject, size = 'sm', className = '' }: SubjectChipProps) {
  const padding = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        padding,
        className,
      ].join(' ')}
      style={{
        background: `color-mix(in oklch, ${subject.color} 18%, transparent)`,
        color: subject.color,
      }}
    >
      {subject.emoji && <span aria-hidden="true">{subject.emoji}</span>}
      <span className="truncate max-w-[160px]">{subject.name}</span>
    </span>
  )
}
