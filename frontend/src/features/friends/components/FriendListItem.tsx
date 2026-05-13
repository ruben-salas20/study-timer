// FriendListItem.tsx — A single item in the accepted friends list.
// Tap on the row body → /u/:id (public profile). The "Eliminar" button on
// the right stops propagation so it doesn't navigate.
import { useNavigate } from 'react-router-dom'
import type { FriendshipEntry } from '../api/friends'
import { Avatar } from '@/features/avatar/components/Avatar'

interface FriendListItemProps {
  entry: FriendshipEntry
  onRemove: (friendshipId: string) => void
  isRemoving?: boolean
}

export function FriendListItem({ entry, onRemove, isRemoving }: FriendListItemProps) {
  const navigate = useNavigate()

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    const confirmed = window.confirm(
      `¿Eliminar a ${entry.user.displayName} de tus amigos?`
    )
    if (confirmed) {
      onRemove(entry.friendshipId)
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-(--color-surface-raised) pr-2">
      <button
        type="button"
        onClick={() => navigate(`/u/${entry.user.id}`)}
        className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3 text-left"
        aria-label={`Ver perfil de ${entry.user.displayName}`}
      >
        <Avatar
          userId={entry.user.id}
          avatar={entry.user.avatar}
          avatarPreset={entry.user.avatarPreset}
          displayName={entry.user.displayName}
          className="flex-shrink-0 w-10 h-10"
        />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-semibold text-sm truncate">{entry.user.displayName}</span>
          <span className="text-[10px] font-mono opacity-50">{entry.user.friendCode}</span>
        </div>
      </button>

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
