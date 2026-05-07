// PendingRequestRow.tsx — A single incoming friend request row
// Shows the requester info and Accept / Reject buttons.
import type { FriendshipEntry } from '../api/friends'

interface PendingRequestRowProps {
  entry: FriendshipEntry
  onAccept: (friendshipId: string) => void
  onReject: (friendshipId: string) => void
  isAccepting?: boolean
  isRejecting?: boolean
}

function initials(displayName: string): string {
  return displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function PendingRequestRow({
  entry,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: PendingRequestRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-(--color-surface-raised) px-4 py-3">
      {/* Avatar / initials */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-(--color-primary)/20 flex items-center justify-center font-semibold text-sm">
        {initials(entry.user.displayName)}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-semibold text-sm truncate">{entry.user.displayName}</span>
        <span className="text-[10px] font-mono opacity-50">{entry.user.friendCode}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onAccept(entry.friendshipId)}
          disabled={isAccepting || isRejecting}
          className="text-xs px-3 py-1.5 rounded-lg bg-(--color-primary) text-white font-semibold disabled:opacity-50 transition-opacity"
          aria-label={`Aceptar solicitud de ${entry.user.displayName}`}
        >
          {isAccepting ? '...' : 'Aceptar'}
        </button>
        <button
          type="button"
          onClick={() => onReject(entry.friendshipId)}
          disabled={isAccepting || isRejecting}
          className="text-xs px-3 py-1.5 rounded-lg border border-current/30 opacity-70 disabled:opacity-30 transition-opacity"
          aria-label={`Rechazar solicitud de ${entry.user.displayName}`}
        >
          {isRejecting ? '...' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}
