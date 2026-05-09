// StatsPage.tsx — Main stats screen at /stats
// Sections: StreakHero, 4 MetricTiles, DayBarChart (14 days), ModeBreakdown.
// Shows empty state when no sessions yet. F8: Skeleton loading states.
import { useStats } from '../hooks/useStats'
import { StreakHero } from '../components/StreakHero'
import { MetricTile } from '../components/MetricTile'
import { DayBarChart } from '../components/DayBarChart'
import { ModeBreakdown } from '../components/ModeBreakdown'
import { SubjectBreakdown } from '../components/SubjectBreakdown'
import { BottomNav } from '@/shared/ui/BottomNav'
import { Skeleton } from '@/shared/ui/Skeleton'
import { EmptyState } from '@/shared/ui/EmptyState'
import pb from '@/shared/pb'

export function StatsPage() {
  // Use the user's stored timezone preference (fallback UTC)
  const userTz = (pb.authStore.model?.timezone as string | undefined) ?? 'UTC'
  const stats = useStats(userTz)

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-6">

        {stats.isLoading && (
          <div className="flex flex-col gap-4">
            {/* Hero skeleton */}
            <Skeleton height="7rem" />
            {/* Metric tiles skeleton */}
            <div className="grid grid-cols-2 gap-3">
              <Skeleton height="5rem" />
              <Skeleton height="5rem" />
              <Skeleton height="5rem" />
              <Skeleton height="5rem" />
            </div>
            {/* Chart skeleton */}
            <Skeleton height="8rem" />
          </div>
        )}

        {!stats.isLoading && stats.isEmpty && (
          <EmptyState
            icon="📊"
            title="Aún sin estadísticas"
            description="Empezá un timer y aparecerán tus stats aquí"
          />
        )}

        {!stats.isEmpty && (
          <>
            {/* ── Streak hero ─────────────────────────────────────────── */}
            <StreakHero streakDays={stats.streak} />

            {/* ── 4 metric tiles ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Hoy" value={stats.todayFmt} />
              <MetricTile label="Semana" value={stats.weekFmt} />
              <MetricTile label="Total" value={stats.allTimeFmt} />
              <MetricTile
                label="Mejor día"
                value={stats.bestDay.fmt}
                sub={stats.bestDay.date}
              />
            </div>

            {/* ── Day bar chart (last 14 days) ─────────────────────────── */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
                Últimos 14 días (minutos)
              </p>
              <div className="overflow-x-auto">
                <DayBarChart data={stats.chartData} maxSec={stats.maxSec} />
              </div>
            </section>

            {/* ── Mode breakdown ───────────────────────────────────────── */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
                Tiempo por modo
              </p>
              <ModeBreakdown byMode={stats.byMode} />
            </section>

            {/* ── Subject breakdown ────────────────────────────────────── */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
                Tiempo por materia
              </p>
              <SubjectBreakdown bySubject={stats.bySubject} />
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
