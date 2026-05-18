// PrizeDisplay.tsx — Shows winner/loser prizes for a challenge
import { Trophy } from 'lucide-react'

interface PrizeDisplayProps {
  prizeWinner: string
  prizeLoser?: string
  /** group_streak is cooperative — the prize belongs to the whole group. */
  cooperative?: boolean
}

export function PrizeDisplay({ prizeWinner, prizeLoser, cooperative }: PrizeDisplayProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Trophy size={14} className="text-yellow-400" />
        <span className="font-medium text-yellow-400">
          {cooperative ? 'Premio del grupo' : 'Premio ganador'}
        </span>
      </div>
      <p className="text-sm">{prizeWinner}</p>

      {prizeLoser && (
        <>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Trophy size={14} className="opacity-40" />
            <span className="font-medium opacity-40">Penitencia perdedor</span>
          </div>
          <p className="text-sm opacity-70">{prizeLoser}</p>
        </>
      )}
    </div>
  )
}
