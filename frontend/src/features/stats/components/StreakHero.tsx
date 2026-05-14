// StreakHero.tsx — Large streak counter hero card.
// Shows the current streak + a remaining-freezes chip when the user has
// any left for this month. The freeze count comes from
// users.freezeBudget which the streak-freeze hook keeps in sync on every
// session end (refills to 2 on month rollover).
import { Shield } from 'lucide-react'

interface StreakHeroProps {
  streakDays: number
  /** Comodines (freezes) remaining for the current month. Pass null/undef
   *  to skip rendering the chip — used in places we don't have the user
   *  context (e.g. someone else's profile). */
  freezesRemaining?: number | null
}

export function StreakHero({ streakDays, freezesRemaining }: StreakHeroProps) {
  const showFreezes = typeof freezesRemaining === 'number'
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-(--color-primary)/10 py-8 gap-2">
      <span
        className="text-7xl font-bold tabular-nums text-(--color-primary) leading-none"
        aria-label={`${streakDays} días seguidos`}
      >
        {streakDays}
      </span>
      <p className="text-sm font-medium opacity-60">días seguidos</p>
      {showFreezes && (
        <span
          className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-(--color-primary)/30 text-(--color-primary)"
          title="Comodines disponibles este mes. Cada uno te cubre un día sin sesión sin romper la racha."
        >
          <Shield size={12} />
          {freezesRemaining}/2 comodines este mes
        </span>
      )}
    </div>
  )
}
