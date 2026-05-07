// ModeCard.tsx — Reusable mode selection tile for the home timer grid
import type { ReactNode } from 'react'

interface ModeCardProps {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
  isSelected?: boolean
}

export function ModeCard({ title, description, icon, onClick, isSelected }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-start gap-3 w-full rounded-2xl px-5 py-5 text-left transition-colors',
        'border',
        isSelected
          ? 'bg-(--color-primary)/15 border-(--color-primary)'
          : 'bg-(--color-surface-raised) border-current/10 hover:border-(--color-primary)/40',
      ].join(' ')}
      aria-pressed={isSelected}
    >
      <span className="text-2xl text-(--color-primary)">{icon}</span>
      <div>
        <p className="font-semibold text-base">{title}</p>
        <p className="text-xs opacity-60 mt-0.5">{description}</p>
      </div>
    </button>
  )
}
