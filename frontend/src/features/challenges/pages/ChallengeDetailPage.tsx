// ChallengeDetailPage.tsx — Detail view for a single challenge at /challenges/:id
// Renders type-specific visualizations + prizes + actions.
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useChallenge, useLeaveChallenge, useCancelChallenge } from '../hooks/useChallenges'
import { useChallengeParticipantSessions } from '../hooks/useChallengeParticipantSessions'
import { RaceLeaderboard } from '../components/RaceLeaderboard'
import { WeeklyGoalGrid } from '../components/WeeklyGoalGrid'
import { DuelHeadToHead } from '../components/DuelHeadToHead'
import { GroupStreakCalendar } from '../components/GroupStreakCalendar'
import { PrizeDisplay } from '../components/PrizeDisplay'
import { BottomNav } from '@/shared/ui/BottomNav'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import pb from '@/shared/pb'
import type { Participant, Challenge } from '../lib/aggregators'
import type { ChallengeRecord } from '../api/challenges'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function toAggParticipant(p: ChallengeRecord['participants'][number]): Participant {
  return {
    id: p.id,
    userId: p.user,
    progressSec: p.progressSec,
    streakDays: p.streakDays,
    joinedAt: p.joinedAt,
  }
}

function toAggChallenge(c: ChallengeRecord): Challenge {
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    targetSec: c.targetSec,
    targetDays: c.targetDays,
    status: c.status,
  }
}

const TYPE_LABELS: Record<string, string> = {
  race: 'Carrera',
  weekly_goal: 'Meta semanal',
  duel: 'Duelo',
  group_streak: 'Racha grupal',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const myId = pb.authStore.model?.id as string

  // ── ALL hooks must be called unconditionally on every render (Rules of Hooks)
  // Previous bug: useChallengeParticipantSessions was called AFTER an early
  // return for isLoading. When isLoading flipped false on the next render,
  // the hook count changed and React threw — ErrorBoundary caught it.
  // Fix: call every hook at the top, derive UI state below, only branch in JSX.
  const { data: challenge, isLoading, error } = useChallenge(id ?? '')
  const leaveMutation = useLeaveChallenge()
  const cancelMutation = useCancelChallenge()
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // For group_streak: fetch sessions for all participants and compute streak
  // Always call this hook (with empty array if challenge not loaded or wrong type).
  const participantUserIds =
    challenge?.type === 'group_streak'
      ? challenge.participants.map((p) => p.user)
      : []
  const { sessionsByUser } = useChallengeParticipantSessions(participantUserIds)

  // ── Early returns (after all hooks) ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center">
        <p className="opacity-50">Cargando reto...</p>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center gap-4">
        <p className="opacity-50">Reto no encontrado</p>
        <button onClick={() => navigate('/challenges')} className="text-sm text-(--color-primary)">
          ← Volver a retos
        </button>
      </div>
    )
  }

  // ── Derived state (challenge is guaranteed defined here) ────────────────────
  const participants = challenge.participants.map(toAggParticipant)
  const aggChallenge = toAggChallenge(challenge)
  const isCreator = challenge.createdBy === myId
  const myParticipant = challenge.participants.find((p) => p.user === myId)
  const canCancel = isCreator && challenge.status === 'pending'
  const canLeave = !!myParticipant && !isCreator

  const userNamesById = new Map<string, string>(
    challenge.participants.map((p) => [p.user, p.userDisplayName])
  )
  function getUserName(userId: string): string {
    if (userId === myId) return 'Tú'
    return userNamesById.get(userId) || `Usuario ${userId.slice(0, 6)}`
  }

  async function handleLeave() {
    if (!myParticipant) return
    await leaveMutation.mutateAsync(myParticipant.id)
    navigate('/challenges')
  }

  async function handleCancel() {
    if (!challenge) return
    await cancelMutation.mutateAsync(challenge.id)
    navigate('/challenges')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-10 pb-4">
        <button
          type="button"
          onClick={() => navigate('/challenges')}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10"
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{challenge.title}</h1>
          <p className="text-xs opacity-40">
            {TYPE_LABELS[challenge.type]} · {STATUS_LABELS[challenge.status]}
          </p>
        </div>
      </header>

      <main className="flex flex-col flex-1 px-6 pb-24 gap-6 overflow-y-auto">

        {/* Dates */}
        <div className="flex gap-4 text-xs opacity-50">
          <span>Inicio: {formatDate(challenge.startsAt)}</span>
          <span>Fin: {formatDate(challenge.endsAt)}</span>
        </div>

        {challenge.description && (
          <p className="text-sm opacity-70 leading-relaxed">{challenge.description}</p>
        )}

        {/* ── Type-specific visualization ───────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">Progreso</h2>

          {challenge.type === 'race' && (
            <RaceLeaderboard
              participants={participants}
              targetSec={challenge.targetSec}
              getUserName={getUserName}
              myUserId={myId}
            />
          )}

          {challenge.type === 'weekly_goal' && (
            <WeeklyGoalGrid
              challenge={aggChallenge}
              participants={participants}
              getUserName={getUserName}
              myUserId={myId}
            />
          )}

          {challenge.type === 'duel' && participants.length >= 2 && (
            <DuelHeadToHead
              participants={participants}
              myUserId={myId}
              getUserName={getUserName}
            />
          )}

          {challenge.type === 'group_streak' && (
            <GroupStreakCalendar
              challenge={aggChallenge}
              participants={participants}
              sessionsByUser={sessionsByUser}
            />
          )}
        </section>

        {/* ── Prizes ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">Premio</h2>
          <PrizeDisplay prizeWinner={challenge.prizeWinner} prizeLoser={challenge.prizeLoser} />
        </section>

        {/* ── Participants ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">
            Participantes ({challenge.participants.length})
          </h2>
          <div className="flex flex-col gap-2">
            {challenge.participants.map((p) => {
              const name = p.user === myId ? 'Tú' : p.userDisplayName
              const initial = (p.user === myId ? 'T' : p.userDisplayName).charAt(0).toUpperCase()
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-2"
                >
                  <div className="w-7 h-7 rounded-full bg-(--color-primary)/20 flex items-center justify-center text-xs font-bold">
                    {initial}
                  </div>
                  <span className="text-sm flex-1">{name}</span>
                  {challenge.createdBy === p.user && (
                    <span className="text-[10px] opacity-40">creador</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              disabled={cancelMutation.isPending}
              className="w-full py-3 rounded-xl border border-red-500/50 text-red-400 text-sm font-medium disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar reto'}
            </button>
          )}
          {canLeave && (
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              disabled={leaveMutation.isPending}
              className="w-full py-3 rounded-xl border border-white/20 text-sm font-medium opacity-60 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-(--color-primary)"
            >
              {leaveMutation.isPending ? 'Saliendo...' : 'Salir del reto'}
            </button>
          )}
        </section>
      </main>

      {/* Leave challenge confirm */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="¿Salir del reto?"
        description="Tu progreso en este reto se conservará pero ya no participarás."
        confirmLabel="Salir"
        cancelLabel="Quedarse"
        variant="danger"
        onConfirm={() => {
          setShowLeaveConfirm(false)
          void handleLeave()
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Cancel challenge confirm */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="¿Cancelar el reto?"
        description="Esta acción cancelará el reto para todos los participantes. No se puede deshacer."
        confirmLabel="Cancelar reto"
        cancelLabel="Mantener"
        variant="danger"
        onConfirm={() => {
          setShowCancelConfirm(false)
          void handleCancel()
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />

      <BottomNav />
    </div>
  )
}
