// ChallengesPage.tsx — Main challenges screen at /challenges
// Sections: active, pending, completed/cancelled (last 10).
// F8: EmptyState + Skeleton loading states.
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMyChallenges } from '../hooks/useChallenges'
import { ChallengeCard } from '../components/ChallengeCard'
import { BottomNav } from '@/shared/ui/BottomNav'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { ChallengeRecord } from '../api/challenges'

export function ChallengesPage() {
  const { data: challenges = [], isLoading } = useMyChallenges()

  const active = challenges.filter((c) => c.status === 'active')
  const pending = challenges.filter((c) => c.status === 'pending')
  const finished = challenges
    .filter((c) => c.status === 'completed' || c.status === 'cancelled')
    .slice(0, 10)

  function toCardData(c: ChallengeRecord) {
    return {
      id: c.id,
      type: c.type,
      title: c.title,
      status: c.status,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      targetSec: c.targetSec,
      targetDays: c.targetDays,
      prizeWinner: c.prizeWinner,
      prizeLoser: c.prizeLoser,
      participantCount: c.participants.length,
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <h1 className="text-2xl font-bold">Retos</h1>
      </header>

      <main className="flex flex-col flex-1 px-6 pb-24 gap-6 overflow-y-auto">

        {/* ── Loading skeleton ──────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            <Skeleton height="5rem" />
            <Skeleton height="5rem" />
            <Skeleton height="5rem" />
          </div>
        )}

        {/* ── Activos ─────────────────────────────────────────────────── */}
        {!isLoading && active.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">Activos</h2>
            <div className="flex flex-col gap-2">
              {active.map((c) => (
                <ChallengeCard key={c.id} challenge={toCardData(c)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Pendientes ───────────────────────────────────────────────── */}
        {!isLoading && pending.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">Pendientes</h2>
            <div className="flex flex-col gap-2">
              {pending.map((c) => (
                <ChallengeCard key={c.id} challenge={toCardData(c)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Finalizados ──────────────────────────────────────────────── */}
        {!isLoading && finished.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">Finalizados</h2>
            <div className="flex flex-col gap-2">
              {finished.map((c) => (
                <ChallengeCard key={c.id} challenge={toCardData(c)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!isLoading && challenges.length === 0 && (
          <EmptyState
            icon="🏆"
            title="No hay retos activos"
            description="Creá un reto y compite con tus amigos"
            action={
              <Link
                to="/challenges/new"
                className="text-sm text-(--color-primary) font-medium"
              >
                Crear tu primer reto →
              </Link>
            }
          />
        )}
      </main>

      {/* FAB */}
      <Link
        to="/challenges/new"
        className="fixed bottom-20 right-6 flex items-center justify-center w-14 h-14 rounded-full bg-(--color-primary) text-white shadow-lg focus-visible:ring-2 focus-visible:ring-(--color-primary)"
        aria-label="Crear reto"
      >
        <Plus size={24} />
      </Link>

      <BottomNav />
    </div>
  )
}
