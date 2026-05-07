// FriendListItem.tsx — A single item in the accepted friends list
// Shows avatar initials, displayName, friendCode, and a remove button.
import type { FriendshipEntry } from '../api/friends'

interface FriendListItemProps {
  entry: FriendshipEntry
  onRemove: (friendshipId: string) => void
  isRemoving?: boolean
}

function initials(displayName: string): string {
  return displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function FriendListItem({ entry, onRemove, isRemoving }: FriendListItemProps) {
  function handleRemove() {
    const confirmed = window.confirm(
      `¿Eliminar a ${entry.user.displayName} de tus amigos?`
    )
    if (confirmed) {
      onRemove(entry.friendshipId)
    }
  }

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

      {/* Remove button */}
      <button
        type="button"
        onClick={handleRemove}
        disabled={isRemoving}
        className="flex-shrink-0 text-xs opacity-50 hover:opacity-80 disabled:opacity-30 transition-opacity px-2 py-1 rounded-lg border border-current/20"
        aria-label={`Eliminar a ${entry.user.displayName}`}
      >
        {isRemoving ? '...' : 'Eliminar'}
      </button>
    </div>
  )
}
