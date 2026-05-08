// ChallengeTypeCard.tsx — Visual selection card for the new challenge wizard.
// Each type has its own emoji icon and accent tint to make scanning faster
// on the small step-1 screen. The selected card lifts and gets a primary ring.
import type { ChallengeType } from '../api/challenges'

interface ChallengeTypeCardProps {
  type: ChallengeType
  selected: boolean
  onSelect: (type: ChallengeType) => void
}

const TYPE_INFO: Record<
  ChallengeType,
  { label: string; description: string; emoji: string; tint: string }
> = {
  race: {
    label: 'Carrera',
    description: 'El primero en alcanzar el objetivo gana',
    emoji: '🏁',
    tint: 'oklch(70% 0.16 30)', // warm amber/red
  },
  weekly_goal: {
    label: 'Meta semanal',
    description: 'Todos buscan una meta de horas en 7 días',
    emoji: '📅',
    tint: 'oklch(70% 0.14 240)', // blue
  },
  duel: {
    label: 'Duelo',
    description: 'Tú contra un amigo — el que más estudie gana',
    emoji: '⚔️',
    tint: 'oklch(65% 0.18 320)', // purple
  },
  group_streak: {
    label: 'Racha grupal',
    description: 'Mantengan la racha de días estudiando juntos',
    emoji: '🔥',
    tint: 'oklch(70% 0.18 60)', // orange
  },
}

export function ChallengeTypeCard({ type, selected, onSelect }: ChallengeTypeCardProps) {
  const info = TYPE_INFO[type]

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={[
        'relative flex items-center gap-4 rounded-2xl border p-4 text-left w-full transition-all',
        selected
          ? 'border-(--color-primary) shadow-lg scale-[1.01]'
          : 'border-white/10 hover:border-white/20',
      ].join(' ')}
      style={{
        background: selected
          ? `linear-gradient(135deg, color-mix(in oklch, ${info.tint} 18%, transparent), color-mix(in oklch, ${info.tint} 6%, transparent))`
          : 'rgba(255,255,255,0.04)',
      }}
      aria-pressed={selected}
    >
      <div
        className="flex items-center justify-center w-14 h-14 rounded-xl text-3xl shrink-0"
        style={{
          background: `color-mix(in oklch, ${info.tint} 22%, transparent)`,
        }}
      >
        {info.emoji}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-base font-semibold leading-tight">{info.label}</span>
        <span className="text-xs opacity-60 leading-snug mt-1">{info.description}</span>
      </div>
      {selected && (
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full bg-(--color-primary) shrink-0 ml-2"
          aria-hidden="true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </button>
  )
}
