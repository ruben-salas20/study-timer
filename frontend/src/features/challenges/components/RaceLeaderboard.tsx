// RaceLeaderboard.tsx — Renders a leaderboard for race-type challenges
import { computeRaceLeader } from '../lib/aggregators'
import type { Participant } from '../lib/aggregators'

interface RaceLeaderboardProps {
  participants: Participant[]
  targetSec?: number
  getUserName: (userId: string) => string
  myUserId: string
}

function formatSec(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function RaceLeaderboard({ participants, targetSec, getUserName, myUserId }: RaceLeaderboardProps) {
  const { winnerId, isFinished, leaderProgressSec } = computeRaceLeader(participants, targetSec)

  const sorted = [...participants].sort((a, b) => b.progressSec - a.progressSec)

  return (
    <div className="flex flex-col gap-3">
      {isFinished && (
        <div className="rounded-xl bg-yellow-500/20 border border-yellow-500/30 px-4 py-2 text-sm text-yellow-400 font-medium text-center">
          Ganador: {getUserName(winnerId ?? '')}
        </div>
      )}

      {sorted.map((p, idx) => {
        const pct = targetSec && targetSec > 0
          ? Math.min(100, Math.round((p.progressSec / targetSec) * 100))
          : 0
        const isMe = p.userId === myUserId

        return (
          <div key={p.userId} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className={isMe ? 'font-semibold text-(--color-primary)' : 'opacity-70'}>
                #{idx + 1} {getUserName(p.userId)} {isMe ? '(tú)' : ''}
              </span>
              <span className="opacity-50">{formatSec(p.progressSec)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-(--color-primary) transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}

      {!isFinished && targetSec && leaderProgressSec < targetSec && (
        <p className="text-xs opacity-40 text-center">
          Objetivo: {formatSec(targetSec)} · Líder: {formatSec(leaderProgressSec)}
        </p>
      )}
    </div>
  )
}
