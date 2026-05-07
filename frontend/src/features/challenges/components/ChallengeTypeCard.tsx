// ChallengeTypeCard.tsx — Selection card for the new challenge wizard step 1
import type { ChallengeType } from '../api/challenges'

interface ChallengeTypeCardProps {
  type: ChallengeType
  selected: boolean
  onSelect: (type: ChallengeType) => void
}

const TYPE_INFO: Record<ChallengeType, { label: string; description: string; emoji: string }> = {
  race: {
    label: 'Carrera',
    description: 'El primero en alcanzar el objetivo de tiempo gana',
    emoji: '🏁',
  },
  weekly_goal: {
    label: 'Meta semanal',
    description: 'Todos intentan alcanzar una meta de horas en 7 días',
    emoji: '📅',
  },
  duel: {
    label: 'Duelo',
    description: 'Tú contra un amigo — el que más estudie al final gana',
    emoji: '⚔️',
  },
  group_streak: {
    label: 'Racha grupal',
    description: 'Mantened la racha de días de estudio juntos',
    emoji: '🔥',
  },
}

export function ChallengeTypeCard({ type, selected, onSelect }: ChallengeTypeCardProps) {
  const info = TYPE_INFO[type]

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={[
        'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors w-full',
        selected
          ? 'border-(--color-primary) bg-(--color-primary)/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10',
      ].join(' ')}
      aria-pressed={selected}
    >
      <span className="text-2xl">{info.emoji}</span>
      <span className="text-sm font-semibold">{info.label}</span>
      <span className="text-xs opacity-60 leading-snug">{info.description}</span>
    </button>
  )
}
