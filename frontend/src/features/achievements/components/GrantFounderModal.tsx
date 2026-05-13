// GrantFounderModal.tsx — admin-only modal that lets the founder hand out
// the special "founder" achievement to chosen friends. Visible only when
// the current user has isAdmin = true on their user record.
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Check, Gem } from 'lucide-react'
import { useFriendsList } from '@/features/friends/hooks/useFriends'
import { Avatar } from '@/features/avatar/components/Avatar'
import { grantAchievement } from '../api/achievements'

interface GrantFounderModalProps {
  onClose: () => void
}

export function GrantFounderModal({ onClose }: GrantFounderModalProps) {
  const friendsQuery = useFriendsList()
  const queryClient = useQueryClient()

  const [granting, setGranting] = useState<string | null>(null)
  const [granted, setGranted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const friends = useMemo(() => friendsQuery.data ?? [], [friendsQuery.data])

  async function handleGrant(userId: string) {
    setError(null)
    setGranting(userId)
    try {
      await grantAchievement(userId, 'founder')
      setGranted((s) => new Set(s).add(userId))
      // The recipient's achievements list will refetch when they next look
      // at it; invalidate the cache key for them just in case it's already
      // loaded locally.
      queryClient.invalidateQueries({ queryKey: ['achievements', 'user', userId] })
    } catch (err) {
      console.error('[GrantFounderModal] grant failed:', err)
      setError(
        'No pudimos otorgar el logro. Confirmá que tu usuario sea admin y reintentá.'
      )
    } finally {
      setGranting(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-founder-title"
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4 shadow-xl max-h-[90dvh] overflow-y-auto"
        style={{
          background: 'var(--color-background, #ffffff)',
          color: 'var(--color-foreground, #0a0a0a)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ color: '#ff5499' }}><Gem size={20} /></span>
            <h2 id="grant-founder-title" className="text-lg font-semibold">
              Otorgar Founder
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 -mr-1 opacity-70 hover:opacity-100"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs opacity-60">
          Elegí un amigo para concederle el logro Founder. Es permanente —
          una vez otorgado solo se puede revocar desde la base de datos.
        </p>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        {friendsQuery.isLoading && (
          <p className="text-sm opacity-60">Cargando amigos…</p>
        )}

        {!friendsQuery.isLoading && friends.length === 0 && (
          <p className="text-sm opacity-60">
            No tenés amigos aceptados para otorgar. Agregalos primero desde /friends.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {friends.map((entry) => {
            const isGranted = granted.has(entry.user.id)
            const isLoading = granting === entry.user.id
            return (
              <li
                key={entry.friendshipId}
                className="flex items-center gap-3 rounded-xl border border-current/15 px-3 py-2.5"
              >
                <Avatar
                  userId={entry.user.id}
                  avatar={entry.user.avatar}
                  avatarPreset={entry.user.avatarPreset}
                  displayName={entry.user.displayName}
                  className="w-10 h-10 shrink-0"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {entry.user.displayName}
                  </span>
                  <span className="text-[10px] font-mono opacity-50 truncate">
                    {entry.user.friendCode}
                  </span>
                </div>
                {isGranted ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: '#ff5499' }}
                  >
                    <Check size={14} /> Otorgado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleGrant(entry.user.id)}
                    disabled={isLoading}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
                    style={{ background: '#ff5499' }}
                  >
                    {isLoading ? 'Otorgando…' : 'Otorgar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="self-stretch py-3 rounded-xl border font-medium"
          style={{ borderColor: 'rgba(127,127,127,0.3)' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
