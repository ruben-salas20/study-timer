// UserProfilePage.tsx — public-facing profile at /u/:id.
//
// Same page renders for yourself (with an "Editar" button) and for any other
// user. Stats are shown only to the user themselves or to accepted friends,
// matching the friends-only visibility we agreed on.
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  Pencil,
  UserPlus,
  Check,
  Flame,
  Trophy,
  Calendar,
  Star,
} from 'lucide-react'
import pb from '@/shared/pb'
import {
  getUserById,
  fetchUserSessions,
  findSharedChallenges,
  isFriendOf,
} from '../api/publicProfile'
import { useSendFriendRequest } from '@/features/friends/hooks/useFriends'
import { Avatar } from '@/features/avatar/components/Avatar'
import { BottomNav } from '@/shared/ui/BottomNav'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import {
  groupSessionsByDay,
  computeStreakDays,
  computeBestDay,
  computeWeekTotal,
} from '@/features/stats/lib/aggregators'

function formatMinutes(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function challengeTypeLabel(t: string): string {
  if (t === 'race') return 'Carrera'
  if (t === 'duel') return 'Duelo'
  if (t === 'weekly_goal') return 'Meta semanal'
  if (t === 'group_streak') return 'Racha grupal'
  return t
}

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const myId = pb.authStore.model?.id as string | undefined
  const isMe = !!id && id === myId
  const sendFriendRequest = useSendFriendRequest()

  const userQuery = useQuery({
    queryKey: ['profile', 'user', id],
    queryFn: () => getUserById(id as string),
    enabled: !!id,
  })

  const friendQuery = useQuery({
    queryKey: ['profile', 'is-friend', id],
    queryFn: () => isFriendOf(id as string),
    enabled: !!id && !isMe,
  })

  const isFriend = isMe || friendQuery.data === true
  const tz =
    (pb.authStore.model?.timezone as string | undefined) ??
    userQuery.data?.timezone ??
    'UTC'

  // Sessions only when we have permission tier to show stats (self or friend).
  const sessionsQuery = useQuery({
    queryKey: ['profile', 'sessions', id],
    queryFn: () => fetchUserSessions(id as string, 365),
    enabled: !!id && isFriend,
  })

  const sharedChallengesQuery = useQuery({
    queryKey: ['profile', 'shared-challenges', myId, id],
    queryFn: () => findSharedChallenges(myId as string, id as string),
    enabled: !!id && !!myId && !isMe,
  })

  const stats = useMemo(() => {
    const sessions = sessionsQuery.data ?? []
    if (sessions.length === 0) return null
    const byDay = groupSessionsByDay(sessions, tz)
    const streak = computeStreakDays(sessions, tz)
    const week = computeWeekTotal(sessions, tz)
    const best = computeBestDay(sessions, tz)
    let total = 0
    for (const s of sessions) total += s.durationSec
    return { byDay, streak, week, best, total }
  }, [sessionsQuery.data, tz])

  async function handleAddFriend() {
    const code = userQuery.data?.friendCode
    if (!code) return
    try {
      await sendFriendRequest.mutateAsync(code)
    } catch (err) {
      console.error('[UserProfilePage] addFriend failed:', err)
    }
  }

  if (!id) {
    navigate('/me', { replace: true })
    return null
  }

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="px-6 pt-10 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="p-2 -ml-2"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold">Perfil</h1>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-6">
        {userQuery.isLoading && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Skeleton height="5rem" />
            <Skeleton height="2rem" />
            <Skeleton height="2rem" />
          </div>
        )}

        {userQuery.isError && (
          <EmptyState
            icon="🚫"
            title="No pudimos cargar este perfil"
            description="El usuario puede no existir o la app perdió conexión."
          />
        )}

        {userQuery.data && (
          <>
            {/* ── Identity ─────────────────────────────────────────────── */}
            <section className="flex flex-col items-center gap-2 pt-2">
              <Avatar
                userId={userQuery.data.id}
                avatar={userQuery.data.avatar}
                avatarPreset={userQuery.data.avatarPreset}
                displayName={userQuery.data.displayName || '?'}
                className="w-24 h-24"
                textClassName="text-4xl"
              />
              <p className="text-xl font-bold">{userQuery.data.displayName || '—'}</p>
              <p className="text-sm font-mono opacity-50">
                {userQuery.data.friendCode || '------'}
              </p>

              {/* CTA row */}
              <div className="flex items-center gap-2 mt-2">
                {isMe && (
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-current/20 text-sm font-medium hover:border-(--color-primary)/50"
                  >
                    <Pencil size={14} /> Editar perfil
                  </button>
                )}
                {!isMe && friendQuery.isSuccess && !friendQuery.data && (
                  <button
                    type="button"
                    onClick={() => void handleAddFriend()}
                    disabled={sendFriendRequest.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-(--color-primary) text-white text-sm font-semibold disabled:opacity-60"
                  >
                    <UserPlus size={14} />
                    {sendFriendRequest.isPending ? 'Enviando…' : 'Agregar amigo'}
                  </button>
                )}
                {!isMe && friendQuery.data === true && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-(--color-primary)/40 text-(--color-primary) text-sm font-medium">
                    <Check size={14} /> Ya son amigos
                  </span>
                )}
              </div>
            </section>

            {/* ── Stats (self or friend only) ──────────────────────────── */}
            {isFriend && (
              <section className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-50">
                  Estadísticas
                </p>
                {sessionsQuery.isLoading && (
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton height="5rem" />
                    <Skeleton height="5rem" />
                    <Skeleton height="5rem" />
                    <Skeleton height="5rem" />
                  </div>
                )}
                {!sessionsQuery.isLoading && !stats && (
                  <p className="text-sm opacity-50 italic">Aún sin sesiones registradas.</p>
                )}
                {stats && (
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile
                      icon={<Flame size={16} />}
                      label="Racha"
                      value={`${stats.streak} ${stats.streak === 1 ? 'día' : 'días'}`}
                    />
                    <StatTile
                      icon={<Trophy size={16} />}
                      label="Total"
                      value={formatMinutes(stats.total)}
                    />
                    <StatTile
                      icon={<Calendar size={16} />}
                      label="Esta semana"
                      value={formatMinutes(stats.week)}
                    />
                    <StatTile
                      icon={<Star size={16} />}
                      label="Mejor día"
                      value={stats.best.totalSec > 0 ? formatMinutes(stats.best.totalSec) : '—'}
                      sub={stats.best.date || undefined}
                    />
                  </div>
                )}
              </section>
            )}

            {/* ── Shared challenges (vs me only) ───────────────────────── */}
            {!isMe && (sharedChallengesQuery.data?.length ?? 0) > 0 && (
              <section className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-50">
                  Retos en común
                </p>
                <ul className="flex flex-col gap-2">
                  {sharedChallengesQuery.data?.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/challenges/${c.id}`)}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-current/15 hover:border-(--color-primary)/40"
                      >
                        <Trophy size={16} className="text-(--color-primary) shrink-0" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{c.title}</span>
                          <span className="text-xs opacity-60">
                            {challengeTypeLabel(c.type)} ·{' '}
                            {c.status === 'pending'
                              ? 'Pendiente'
                              : c.status === 'active'
                                ? 'Activo'
                                : 'Finalizado'}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Privacy hint when looking at a stranger */}
            {!isMe && friendQuery.isSuccess && !friendQuery.data && (
              <p className="text-xs opacity-50 text-center italic pt-2">
                Agregalo como amigo para ver sus estadísticas.
              </p>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}

function StatTile({ icon, label, value, sub }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl border border-current/15">
      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest opacity-60">
        {icon}
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
      {sub && <span className="text-[11px] opacity-50">{sub}</span>}
    </div>
  )
}
