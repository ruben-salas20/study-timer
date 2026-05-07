// ChallengeCard.tsx — Summary card for a single challenge shown in lists
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { ChallengeStatus, ChallengeType } from '../api/challenges'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChallengeCardData {
  id: string
  type: ChallengeType
  title: string
  status: ChallengeStatus
  startsAt: string
  endsAt: string
  targetSec?: number
  targetDays?: number
  prizeWinner: string
  prizeLoser?: string
  participantCount: number
}

interface ChallengeCardProps {
  challenge: ChallengeCardData
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ChallengeStatus, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<ChallengeStatus, string> = {
  active: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-blue-500/20 text-blue-400',
  cancelled: 'bg-gray-500/20 text-gray-400',
}

const TYPE_LABELS: Record<ChallengeType, string> = {
  race: 'Carrera',
  weekly_goal: 'Meta semanal',
  duel: 'Duelo',
  group_streak: 'Racha grupal',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const statusLabel = STATUS_LABELS[challenge.status]
  const statusColor = STATUS_COLORS[challenge.status]
  const typeLabel = TYPE_LABELS[challenge.type]

  return (
    <Link
      to={`/challenges/${challenge.id}`}
      className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 transition-colors hover:bg-white/10"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] opacity-50">{typeLabel}</span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold leading-snug line-clamp-2">{challenge.title}</p>

      {/* Footer: participants */}
      <div className="flex items-center gap-1 text-xs opacity-50">
        <Users size={12} />
        <span>{challenge.participantCount}</span>
      </div>
    </Link>
  )
}
