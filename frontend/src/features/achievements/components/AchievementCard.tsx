// AchievementCard.tsx — visual card for one achievement (locked or unlocked).
import type { AchievementDef } from '../lib/registry'
import { TIER_STYLE } from '../lib/registry'
import { Lock } from 'lucide-react'

interface AchievementCardProps {
  def: AchievementDef
  unlocked: boolean
  unlockedAt?: string
  /** Compact variant for the public-profile strip. */
  compact?: boolean
}

function formatUnlockDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  ) {
    return 'Hoy'
  }
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

export function AchievementCard({ def, unlocked, unlockedAt, compact }: AchievementCardProps) {
  const tier = TIER_STYLE[def.tier]
  const Icon = def.icon

  if (compact) {
    return (
      <div
        className="flex flex-col items-center gap-1 rounded-xl border p-2"
        style={{
          borderColor: unlocked ? `${tier.color}55` : 'rgba(127,127,127,0.2)',
          opacity: unlocked ? 1 : 0.45,
          minWidth: 72,
        }}
        title={`${def.name} — ${def.description}`}
      >
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
          style={{
            background: unlocked ? `${tier.color}22` : 'rgba(127,127,127,0.12)',
            color: unlocked ? tier.color : 'rgba(127,127,127,0.7)',
          }}
        >
          {unlocked ? <Icon size={18} /> : <Lock size={16} />}
        </span>
        <span className="text-[10px] font-medium text-center truncate w-full">
          {def.name}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-3"
      style={{
        borderColor: unlocked ? `${tier.color}55` : 'rgba(127,127,127,0.2)',
        background: unlocked ? `${tier.color}10` : 'transparent',
        opacity: unlocked ? 1 : 0.55,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
          style={{
            background: unlocked ? `${tier.color}22` : 'rgba(127,127,127,0.12)',
            color: unlocked ? tier.color : 'rgba(127,127,127,0.7)',
          }}
        >
          {unlocked ? <Icon size={24} /> : <Lock size={20} />}
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{def.name}</span>
            <span
              className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background: `${tier.color}22`,
                color: tier.color,
              }}
            >
              {tier.label}
            </span>
          </div>
          <span className="text-xs opacity-60 truncate">{def.description}</span>
          {unlocked && unlockedAt && (
            <span className="text-[10px] opacity-50 mt-0.5">
              Desbloqueado · {formatUnlockDate(unlockedAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
