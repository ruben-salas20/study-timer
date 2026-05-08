// NewChallengePage.tsx — Multi-step wizard to create a new challenge
// Step 1: Select type
// Step 2: Type-specific config (target, dates)
// Step 3: Prizes
// Step 4: Invite participants from accepted friends
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft } from 'lucide-react'
import { ChallengeTypeCard } from '../components/ChallengeTypeCard'
import { useCreateChallenge } from '../hooks/useChallenges'
import { BottomNav } from '@/shared/ui/BottomNav'
import type { ChallengeType } from '../api/challenges'
import { useFriendsList } from '@/features/friends/hooks/useFriends'

// ── Wizard steps ──────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

const CHALLENGE_TYPES: ChallengeType[] = ['race', 'weekly_goal', 'duel', 'group_streak']

// ── Form schema (step 2 fields) ───────────────────────────────────────────────

const step2Schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(80, 'Máximo 80'),
  description: z.string().max(500).optional(),
  startsAt: z.string().min(1, 'Selecciona fecha de inicio'),
  endsAt: z.string().min(1, 'Selecciona fecha de fin'),
  targetSec: z.number().optional(),
  targetDays: z.number().optional(),
})

type Step2Data = z.infer<typeof step2Schema>

// ── Component ─────────────────────────────────────────────────────────────────

export function NewChallengePage() {
  const navigate = useNavigate()
  const createMutation = useCreateChallenge()
  const { data: friends = [] } = useFriendsList()

  const [step, setStep] = useState<Step>(1)
  const [selectedType, setSelectedType] = useState<ChallengeType>('race')
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
  const [prizeWinner, setPrizeWinner] = useState('')
  const [prizeLoser, setPrizeLoser] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
  })

  // ── Handlers ────────────────────────────────────────────────────────────────

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as Step)
    else navigate(-1)
  }

  function onStep2Submit(data: Step2Data) {
    setStep2Data(data)
    setStep(3)
  }

  function toggleFriend(userId: string) {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  async function onFinalSubmit() {
    if (!step2Data) return
    setSubmitting(true)
    setError(null)

    try {
      const challenge = await createMutation.mutateAsync({
        data: {
          type: selectedType,
          title: step2Data.title,
          description: step2Data.description,
          startsAt: new Date(step2Data.startsAt),
          endsAt: new Date(step2Data.endsAt),
          targetSec: step2Data.targetSec,
          targetDays: step2Data.targetDays,
          prizeWinner,
          prizeLoser: prizeLoser || undefined,
          status: 'pending',
        },
        participantUserIds: selectedFriendIds,
      })

      navigate(`/challenges/${challenge.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el reto')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const stepLabel = `Paso ${step} de 4`

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 pt-10 pb-4">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10"
          aria-label="Volver"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Crear reto</h1>
          <p className="text-xs opacity-40">{stepLabel}</p>
        </div>
      </header>

      <main className="flex flex-col flex-1 px-6 pb-24 gap-6 overflow-y-auto">

        {/* ── Step 1: Select type ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm opacity-60">¿Qué tipo de reto quieres crear?</p>
            <div className="grid grid-cols-1 gap-3">
              {CHALLENGE_TYPES.map((type) => (
                <ChallengeTypeCard
                  key={type}
                  type={type}
                  selected={selectedType === type}
                  onSelect={setSelectedType}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-(--color-primary) text-white font-medium"
            >
              Continuar
            </button>
          </div>
        )}

        {/* ── Step 2: Config ───────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleSubmit(onStep2Submit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-50">Título</label>
              <input
                {...register('title')}
                placeholder="Nombre del reto"
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary)"
              />
              {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-50">Descripción (opcional)</label>
              <textarea
                {...register('description')}
                placeholder="Describe el reto..."
                rows={2}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary) resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs opacity-50">Empieza</label>
                <input
                  {...register('startsAt')}
                  type="datetime-local"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary)"
                />
                {errors.startsAt && <p className="text-xs text-red-400">{errors.startsAt.message}</p>}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs opacity-50">Termina</label>
                <input
                  {...register('endsAt')}
                  type="datetime-local"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary)"
                />
                {errors.endsAt && <p className="text-xs text-red-400">{errors.endsAt.message}</p>}
              </div>
            </div>

            {/* Type-specific fields */}
            {(selectedType === 'race' || selectedType === 'weekly_goal' || selectedType === 'duel') && (
              <div className="flex flex-col gap-1">
                <label className="text-xs opacity-50">Objetivo (horas)</label>
                <Controller
                  name="targetSec"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 10"
                      value={field.value ? field.value / 3600 : ''}
                      onChange={(e) => field.onChange(Number(e.target.value) * 3600)}
                      className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary)"
                    />
                  )}
                />
              </div>
            )}

            {selectedType === 'group_streak' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs opacity-50">Días de racha (3–30)</label>
                <Controller
                  name="targetDays"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="number"
                      min={3}
                      max={30}
                      placeholder="e.g. 7"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary)"
                    />
                  )}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-(--color-primary) text-white font-medium mt-2"
            >
              Continuar
            </button>
          </form>
        )}

        {/* ── Step 3: Prizes ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm opacity-60">¿Qué está en juego?</p>
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-50">Premio ganador *</label>
              <input
                value={prizeWinner}
                onChange={(e) => setPrizeWinner(e.target.value)}
                placeholder="El ganador..."
                maxLength={200}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-50">Penitencia perdedor (opcional)</label>
              <input
                value={prizeLoser}
                onChange={(e) => setPrizeLoser(e.target.value)}
                placeholder="El perdedor..."
                maxLength={200}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>
            <button
              type="button"
              disabled={!prizeWinner.trim()}
              onClick={() => setStep(4)}
              className="w-full py-3 rounded-xl bg-(--color-primary) text-white font-medium disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        )}

        {/* ── Step 4: Invite participants ───────────────────────────────── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm opacity-60">
              Invita amigos al reto ({selectedFriendIds.length} seleccionados)
            </p>

            {friends.length === 0 ? (
              <p className="text-sm opacity-40 text-center py-4">No tienes amigos aún</p>
            ) : (
              <div className="flex flex-col gap-2">
                {friends.map((entry) => (
                  <button
                    key={entry.friendshipId}
                    type="button"
                    onClick={() => toggleFriend(entry.user.id)}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      selectedFriendIds.includes(entry.user.id)
                        ? 'border-(--color-primary) bg-(--color-primary)/10'
                        : 'border-white/10 bg-white/5',
                    ].join(' ')}
                  >
                    <div className="w-8 h-8 rounded-full bg-(--color-primary)/20 flex items-center justify-center text-xs font-bold">
                      {entry.user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm flex-1">{entry.user.displayName}</span>
                    {selectedFriendIds.includes(entry.user.id) && (
                      <span className="text-xs text-(--color-primary)">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <button
              type="button"
              onClick={onFinalSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-(--color-primary) text-white font-medium disabled:opacity-60"
            >
              {submitting ? 'Creando reto...' : 'Crear reto'}
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
