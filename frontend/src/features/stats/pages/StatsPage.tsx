// StatsPage.tsx — Main stats screen at /stats
// Sections: StreakHero, 4 MetricTiles, DayBarChart (14 days), ModeBreakdown.
// Shows empty state when no sessions yet.
import { useStats } from '../hooks/useStats'
import { StreakHero } from '../components/StreakHero'
import { MetricTile } from '../components/MetricTile'
import { DayBarChart } from '../components/DayBarChart'
import { ModeBreakdown } from '../components/ModeBreakdown'
import { BottomNav } from '@/shared/ui/BottomNav'
import pb from '@/shared/pb'

export function StatsPage() {
  // Use the user's stored timezone preference (fallback UTC)
  const userTz = (pb.authStore.model?.timezone as string | undefined) ?? 'UTC'
  const stats = useStats(userTz)

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
      </header>

      <main className="flex flex-col flex-1 px-6 pb-24 gap-6 overflow-y-auto">

        {stats.isLoading && (
          <p className="text-sm opacity-50 text-center py-8">Cargando estadísticas...</p>
        )}

        {!stats.isLoading && stats.isEmpty && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-5xl">📊</p>
            <p className="text-base font-medium">Aún sin estadísticas</p>
            <p className="text-sm opacity-50">
              Empezá un timer y aparecerán tus stats
            </p>
          </div>
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
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
