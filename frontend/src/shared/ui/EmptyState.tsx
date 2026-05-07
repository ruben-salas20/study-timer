// EmptyState.tsx — Generic empty state component
// Renders an icon, title, description, and optional action button.
// Used when list/data queries return empty results.
import type { ReactNode } from 'react'

export interface EmptyStateProps {
  /** Emoji or icon element shown above the title */
  icon?: ReactNode
  /** Primary empty state label */
  title: string
  /** Supporting text with context or instructions */
  description?: string
  /** Optional call-to-action rendered as a child element (button, link, etc.) */
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      {icon && <div className="text-4xl mb-1">{icon}</div>}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-sm opacity-50 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
