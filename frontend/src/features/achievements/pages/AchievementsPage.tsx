// AchievementsPage.tsx — full grid of the 25 achievements for the current
// user. Locked items render grayed; unlocked ones tint with their tier
// colour. Reachable from /me → Logros.
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useMyAchievements } from '../hooks/useAchievements'
import { ACHIEVEMENTS, ACHIEVEMENTS_TOTAL } from '../lib/registry'
import { AchievementCard } from '../components/AchievementCard'
import { BottomNav } from '@/shared/ui/BottomNav'
import { Skeleton } from '@/shared/ui/Skeleton'

export function AchievementsPage() {
  const navigate = useNavigate()
  const { data: unlocked = [], isLoading } = useMyAchievements()

  const unlockedMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of unlocked) m.set(u.key, u.unlockedAt)
    return m
  }, [unlocked])

  const unlockedCount = unlockedMap.size

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="px-6 pt-10 pb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/me')}
          aria-label="Volver"
          className="p-2 -ml-2"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold">Logros</h1>
        <span className="ml-auto text-sm font-mono opacity-60 tabular-nums">
          {unlockedCount}/{ACHIEVEMENTS_TOTAL}
        </span>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-3">
        {isLoading && (
          <div className="flex flex-col gap-3">
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((def) => (
              <AchievementCard
                key={def.key}
                def={def}
                unlocked={unlockedMap.has(def.key)}
                unlockedAt={unlockedMap.get(def.key)}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
