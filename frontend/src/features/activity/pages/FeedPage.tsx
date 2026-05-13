// FeedPage.tsx — chronological feed of session completions and challenge wins
// from the authenticated user and their friends. Lives at /feed.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Clock, Trophy, Flag, Calendar, Repeat } from 'lucide-react'
import pb from '@/shared/pb'
import {
  listActivityFeed,
  type ActivityEvent,
  type SessionCompletedPayload,
  type ChallengeWonPayload,
} from '../api/feed'
import {
  listReactionsForEvents,
  type EventReactionSummary,
} from '../api/reactions'
import { ReactionsBar } from '../components/ReactionsBar'
import { useFriendsList } from '@/features/friends/hooks/useFriends'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { Avatar } from '@/features/avatar/components/Avatar'
import { BottomNav } from '@/shared/ui/BottomNav'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'

const PER_PAGE = 30

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.round((now - then) / 1000))
  if (diffSec < 60) return 'ahora'
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86_400) return `hace ${Math.floor(diffSec / 3600)} h`
  if (diffSec < 7 * 86_400) return `hace ${Math.floor(diffSec / 86_400)} d`
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function modeIcon(mode: SessionCompletedPayload['mode']) {
  if (mode === 'pomodoro') return <Repeat size={14} aria-hidden="true" />
  if (mode === 'countdown') return <Calendar size={14} aria-hidden="true" />
  return <Clock size={14} aria-hidden="true" />
}

function challengeTypeLabel(t: ChallengeWonPayload['challengeType']): string {
  if (t === 'race') return 'Carrera'
  if (t === 'duel') return 'Duelo'
  if (t === 'weekly_goal') return 'Meta semanal'
  return 'Racha grupal'
}

export function FeedPage() {
  const navigate = useNavigate()
  const myId = pb.authStore.model?.id as string | undefined
  const friendsQuery = useFriendsList()
  const subjectsQuery = useSubjects()
  const [page, setPage] = useState(1)

  const actorIds = useMemo(() => {
    const ids: string[] = []
    if (myId) ids.push(myId)
    for (const f of friendsQuery.data ?? []) ids.push(f.user.id)
    return ids
  }, [myId, friendsQuery.data])

  const feedQuery = useQuery({
    queryKey: ['feed', actorIds.slice().sort().join(','), page],
    queryFn: () => listActivityFeed(actorIds, page, PER_PAGE),
    enabled: actorIds.length > 0,
    staleTime: 30_000,
  })

  const events = feedQuery.data?.events ?? []
  const hasMore = (feedQuery.data?.totalPages ?? 1) > page

  // Reactions for the visible events. Refetches when the event set changes
  // (new page, new realtime data). Each ReactionsBar holds its own optimistic
  // local copy of the summary, so quick taps don't await a roundtrip.
  const eventIdsKey = events.map((ev) => ev.id).join(',')
  const reactionsQuery = useQuery({
    queryKey: ['feed', 'reactions', eventIdsKey],
    queryFn: () => listReactionsForEvents(events.map((ev) => ev.id)),
    enabled: events.length > 0,
    staleTime: 30_000,
  })
  const reactionsMap = reactionsQuery.data ?? new Map<string, EventReactionSummary>()

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="px-6 pt-10 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/me')}
          aria-label="Volver a Yo"
          className="p-2 -ml-2"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold">Actividad</h1>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-3">
        {feedQuery.isLoading && (
          <div className="flex flex-col gap-3">
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
          </div>
        )}

        {!feedQuery.isLoading && events.length === 0 && (
          <EmptyState
            icon="📰"
            title="Sin actividad reciente"
            description={
              actorIds.length <= 1
                ? 'Agregá amigos para ver lo que estudian.'
                : 'Las sesiones de 25 min o más y los retos ganados aparecerán acá.'
            }
          />
        )}

        {events.length > 0 && (
          <ul className="flex flex-col gap-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <FeedRow
                  event={ev}
                  subjects={subjectsQuery.data ?? []}
                  isMe={ev.actor.id === myId}
                  reactions={reactionsMap.get(ev.id) ?? { counts: {}, myReactionIds: {} }}
                  onNavigate={(to) => navigate(to)}
                />
              </li>
            ))}
          </ul>
        )}

        {events.length > 0 && hasMore && (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="self-center mt-2 px-4 py-2 rounded-xl border border-current/20 text-sm font-medium hover:border-(--color-primary)/50 transition-colors"
          >
            Cargar más
          </button>
        )}

        {events.length > 0 && page > 1 && (
          <button
            type="button"
            onClick={() => setPage(1)}
            className="self-center text-xs opacity-60 underline"
          >
            Volver al inicio
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface SubjectLite {
  id: string
  name: string
  emoji?: string
  color: string
}

interface FeedRowProps {
  event: ActivityEvent
  subjects: SubjectLite[]
  isMe: boolean
  reactions: EventReactionSummary
  onNavigate: (to: string) => void
}

function FeedRow({ event, subjects, isMe, reactions, onNavigate }: FeedRowProps) {
  const actorName = isMe ? 'Vos' : event.actor.displayName

  // Body-tap target depends on event type. Avatar always navigates to profile.
  let bodyHref = '#'
  let bodyDisabled = false
  let bodyContent: React.ReactNode = null

  if (event.type === 'session_completed') {
    const p = event.payload as SessionCompletedPayload
    const subject = p.subject ? subjects.find((s) => s.id === p.subject) : null
    bodyHref = `/timer/summary/${p.sessionId}`
    bodyDisabled = !isMe
    bodyContent = (
      <>
        <p className="text-sm">
          <span className="font-semibold">{actorName}</span>{' '}
          terminó una sesión de{' '}
          <span className="font-semibold tabular-nums">{formatDuration(p.durationSec)}</span>
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs opacity-60 flex-wrap">
          <span className="inline-flex items-center gap-1">
            {modeIcon(p.mode)}
            {p.mode === 'pomodoro' ? 'Pomodoro' : p.mode === 'countdown' ? 'Regresiva' : 'Cronómetro'}
          </span>
          {subject && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: `${subject.color}22`, color: subject.color }}
            >
              {subject.emoji && <span>{subject.emoji}</span>}
              {subject.name}
            </span>
          )}
          <span className="ml-auto">{relativeTime(event.created)}</span>
        </div>
      </>
    )
  } else {
    const p = event.payload as ChallengeWonPayload
    bodyHref = `/challenges/${p.challengeId}`
    bodyContent = (
      <>
        <p className="text-sm">
          <span className="font-semibold">{actorName}</span>{' '}
          ganó el reto{' '}
          <span className="font-semibold">"{p.challengeTitle}"</span>
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs opacity-60 flex-wrap">
          <span className="inline-flex items-center gap-1">
            {p.challengeType === 'group_streak' ? <Flag size={14} /> : <Trophy size={14} />}
            {challengeTypeLabel(p.challengeType)}
          </span>
          {p.progressSec != null && (
            <span className="font-semibold tabular-nums">
              {formatDuration(p.progressSec)}
            </span>
          )}
          {p.streakDays != null && (
            <span className="font-semibold tabular-nums">
              {p.streakDays} días
            </span>
          )}
          <span className="ml-auto">{relativeTime(event.created)}</span>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-current/15">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate(`/u/${event.actor.id}`)}
          aria-label={`Ver perfil de ${event.actor.displayName}`}
          className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-(--color-primary)/60"
        >
          <Avatar
            userId={event.actor.id}
            avatar={event.actor.avatar}
            avatarPreset={event.actor.avatarPreset}
            displayName={event.actor.displayName}
            className="w-10 h-10"
            textClassName="text-sm"
          />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(bodyHref)}
          disabled={bodyDisabled}
          className="flex-1 min-w-0 text-left"
        >
          {bodyContent}
        </button>
      </div>
      <div className="pl-13">
        <ReactionsBar eventId={event.id} initial={reactions} />
      </div>
    </div>
  )
}
