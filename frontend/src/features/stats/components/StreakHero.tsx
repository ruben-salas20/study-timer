// StreakHero.tsx — Large streak counter hero card.
// Displays current streak in bold tabular-nums style.

interface StreakHeroProps {
  streakDays: number
}

export function StreakHero({ streakDays }: StreakHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-(--color-primary)/10 py-8 gap-2">
      <span
        className="text-7xl font-bold tabular-nums text-(--color-primary) leading-none"
        aria-label={`${streakDays} días seguidos`}
      >
        {streakDays}
      </span>
      <p className="text-sm font-medium opacity-60">días seguidos</p>
    </div>
  )
}
