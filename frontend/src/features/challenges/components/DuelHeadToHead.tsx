// DuelHeadToHead.tsx — Head-to-head view for duel-type challenges
import { computeDuelState } from '../lib/aggregators'
import type { Participant } from '../lib/aggregators'

interface DuelHeadToHeadProps {
  participants: Participant[]
  myUserId: string
  getUserName: (userId: string) => string
}

function formatSec(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function DuelHeadToHead({ participants, myUserId, getUserName }: DuelHeadToHeadProps) {
  if (participants.length < 2) return null

  const { leadingUserId, trailingUserId, leaderProgressSec, gapSec } = computeDuelState(participants)

  const amILeading = leadingUserId === myUserId
  const opponentId = amILeading ? trailingUserId : leadingUserId
  const myProgress = participants.find((p) => p.userId === myUserId)?.progressSec ?? 0
  const opponentProgress = participants.find((p) => p.userId === opponentId)?.progressSec ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Status banner */}
      <div className={[
        'rounded-xl px-4 py-2 text-sm font-medium text-center',
        amILeading
          ? 'bg-green-500/20 text-green-400'
          : gapSec === 0
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-red-500/20 text-red-400',
      ].join(' ')}>
        {gapSec === 0
          ? 'Empate'
          : amILeading
            ? `Vas por delante · +${formatSec(gapSec)}`
            : `Vas por detrás · -${formatSec(gapSec)}`}
      </div>

      {/* Side-by-side */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-(--color-primary)">Tú</span>
          <span className="text-2xl font-bold">{formatSec(myProgress)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs opacity-50">{getUserName(opponentId)}</span>
          <span className="text-2xl font-bold opacity-70">{formatSec(opponentProgress)}</span>
        </div>
      </div>

      {/* Leader label */}
      <p className="text-xs opacity-40 text-center">
        Líder: {getUserName(leadingUserId)} con {formatSec(leaderProgressSec)}
      </p>
    </div>
  )
}
