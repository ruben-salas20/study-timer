// RankingRow.tsx — A single row in the weekly ranking list
import type { RankingEntry } from '../hooks/useWeeklyRanking'
import { Avatar } from '@/features/avatar/components/Avatar'

interface RankingRowProps {
  entry: RankingEntry
  rank: number
}

function formatMinutes(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function RankingRow({ entry, rank }: RankingRowProps) {
  const isFirst = rank === 1

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-xl px-4 py-3',
        entry.isMe
          ? 'bg-(--color-primary)/15 border border-(--color-primary)/30'
          : 'bg-(--color-surface-raised)',
      ].join(' ')}
    >
      {/* Rank badge */}
      <span
        className={[
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
          isFirst ? 'bg-(--color-primary) text-white' : 'bg-current/10 opacity-60',
        ].join(' ')}
      >
        {rank}
      </span>

      <Avatar
        userId={entry.userId}
        avatar={entry.avatar}
        avatarPreset={entry.avatarPreset}
        displayName={entry.displayName}
        className="flex-shrink-0 w-9 h-9"
      />

      {/* Name + friend code */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-semibold text-sm truncate">
          {entry.displayName}
          {entry.isMe && (
            <span className="ml-2 text-[10px] font-normal opacity-60">(tú)</span>
          )}
        </span>
        <span className="text-[10px] font-mono opacity-50">{entry.friendCode}</span>
      </div>

      {/* Total time */}
      <span className="flex-shrink-0 font-bold text-sm tabular-nums">
        {formatMinutes(entry.totalSec)}
      </span>
    </div>
  )
}
