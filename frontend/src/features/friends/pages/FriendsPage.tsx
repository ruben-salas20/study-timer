// FriendsPage.tsx — Main friends screen at /friends
// Sections: weekly ranking, incoming requests, accepted friends list.
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useWeeklyRanking } from '../hooks/useWeeklyRanking'
import {
  useFriendsList,
  useIncomingRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useRemoveFriend,
} from '../hooks/useFriends'
import { RankingRow } from '../components/RankingRow'
import { FriendListItem } from '../components/FriendListItem'
import { PendingRequestRow } from '../components/PendingRequestRow'
import { BottomNav } from '@/shared/ui/BottomNav'

export function FriendsPage() {
  const { ranking } = useWeeklyRanking()
  const { data: friends = [] } = useFriendsList()
  const { data: incoming = [] } = useIncomingRequests()

  const acceptMutation = useAcceptFriendRequest()
  const rejectMutation = useRejectFriendRequest()
  const removeMutation = useRemoveFriend()

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <h1 className="text-2xl font-bold">Amigos</h1>
        <Link
          to="/friends/add"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-(--color-primary) text-white"
          aria-label="Agregar amigo"
        >
          <UserPlus size={18} />
        </Link>
      </header>

      <main className="flex flex-col flex-1 px-6 pb-4 gap-6 overflow-y-auto">

        {/* ── Ranking semanal ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">
            Ranking semanal
          </h2>

          {ranking.length === 0 ? (
            <p className="text-sm opacity-50 text-center py-4">
              Agrega amigos para ver el ranking
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {ranking.map((entry, idx) => (
                <RankingRow key={entry.userId} entry={entry} rank={idx + 1} />
              ))}
            </div>
          )}
        </section>

        {/* ── Solicitudes pendientes ───────────────────────────────────── */}
        {incoming.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">
              Solicitudes pendientes ({incoming.length})
            </h2>
            <div className="flex flex-col gap-2">
              {incoming.map((entry) => (
                <PendingRequestRow
                  key={entry.friendshipId}
                  entry={entry}
                  onAccept={(id) => void acceptMutation.mutateAsync(id)}
                  onReject={(id) => void rejectMutation.mutateAsync(id)}
                  isAccepting={
                    acceptMutation.isPending &&
                    acceptMutation.variables === entry.friendshipId
                  }
                  isRejecting={
                    rejectMutation.isPending &&
                    rejectMutation.variables === entry.friendshipId
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Mis amigos ───────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">
            Mis amigos ({friends.length})
          </h2>

          {friends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm opacity-50">Aún no tienes amigos</p>
              <Link
                to="/friends/add"
                className="text-sm text-(--color-primary) font-medium"
              >
                Agregar por código →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.map((entry) => (
                <FriendListItem
                  key={entry.friendshipId}
                  entry={entry}
                  onRemove={(id) => void removeMutation.mutateAsync(id)}
                  isRemoving={
                    removeMutation.isPending &&
                    removeMutation.variables === entry.friendshipId
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
