// NewChallengePage.tsx — Multi-step wizard to create a new challenge.
// Step 1: Type · Step 2: Config (title, dates, goal) · Step 3: Prizes · Step 4: Friends
//
// UX rework:
// - Top stepper with a 4-segment progress bar (no more "Paso N de 4" text)
// - ChallengeTypeCard with per-type accent tint and selection check
// - Date+time inputs replaced with DateTimePicker (date input + wheel pickers)
// - Goal hours uses a WheelPicker for consistency with the timer config
// - Friends step has search + visible selection counter
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, Trophy, Frown } from 'lucide-react'
import { ChallengeTypeCard } from '../components/ChallengeTypeCard'
import { useCreateChallenge } from '../hooks/useChallenges'
import { BottomNav } from '@/shared/ui/BottomNav'
import { DateTimePicker } from '@/shared/ui/DateTimePicker'
import { WheelPicker } from '@/shared/ui/WheelPicker'
import type { ChallengeType } from '../api/challenges'
import { useFriendsList } from '@/features/friends/hooks/useFriends'
import { Avatar } from '@/features/avatar/components/Avatar'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

const CHALLENGE_TYPES: ChallengeType[] = ['race', 'weekly_goal', 'duel', 'group_streak']

const HOUR_VALUES = Array.from({ length: 100 }, (_, i) => i + 1) // 1..100h
const STREAK_DAY_VALUES = Array.from({ length: 28 }, (_, i) => i + 3) // 3..30d

interface Step2State {
  title: string
  description: string
  startsAt: string // "YYYY-MM-DDTHH:mm" local
  endsAt: string
  targetHours: number
  targetDays: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function defaultDateTime(offsetDays: number, hour = 9, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}`
}

function todayDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const idx = i + 1
        const active = idx <= step
        return (
          <div
            key={idx}
            className={[
              'h-1.5 rounded-full transition-all flex-1',
              active ? 'bg-(--color-primary)' : 'bg-white/10',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NewChallengePage() {
  const navigate = useNavigate()
  const createMutation = useCreateChallenge()
  const { data: friends = [] } = useFriendsList()

  const [step, setStep] = useState<Step>(1)
  const [selectedType, setSelectedType] = useState<ChallengeType>('race')

  const [step2, setStep2] = useState<Step2State>({
    title: '',
    description: '',
    startsAt: defaultDateTime(0, new Date().getHours(), Math.round(new Date().getMinutes() / 5) * 5),
    endsAt: defaultDateTime(7, 23, 55),
    targetHours: 10,
    targetDays: 7,
  })
  const [step2Error, setStep2Error] = useState<string | null>(null)

  const [prizeWinner, setPrizeWinner] = useState('')
  const [prizeLoser, setPrizeLoser] = useState('')

  const [friendQuery, setFriendQuery] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) =>
      f.user.displayName.toLowerCase().includes(q) ||
      (f.user.friendCode ?? '').toLowerCase().includes(q)
    )
  }, [friends, friendQuery])

  const showHoursTarget =
    selectedType === 'race' || selectedType === 'weekly_goal' || selectedType === 'duel'
  const showDaysTarget = selectedType === 'group_streak'

  // ── Handlers ──────────────────────────────────────────────────────────────

  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as Step)
    else navigate(-1)
  }

  function validateStep2(): string | null {
    if (step2.title.trim().length < 3) return 'El título debe tener al menos 3 caracteres'
    if (step2.title.length > 80) return 'El título es demasiado largo'
    if (!step2.startsAt) return 'Selecciona la fecha de inicio'
    if (!step2.endsAt) return 'Selecciona la fecha de fin'
    const start = new Date(step2.startsAt)
    const end = new Date(step2.endsAt)
    if (end <= start) return 'La fecha de fin debe ser posterior al inicio'
    return null
  }

  function nextFromStep2() {
    const err = validateStep2()
    if (err) {
      setStep2Error(err)
      return
    }
    setStep2Error(null)
    setStep(3)
  }

  function toggleFriend(userId: string) {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  async function onFinalSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const challenge = await createMutation.mutateAsync({
        data: {
          type: selectedType,
          title: step2.title.trim(),
          description: step2.description.trim() || undefined,
          startsAt: new Date(step2.startsAt),
          endsAt: new Date(step2.endsAt),
          targetSec: showHoursTarget ? step2.targetHours * 3600 : undefined,
          targetDays: showDaysTarget ? step2.targetDays : undefined,
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="flex flex-col gap-3 px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10"
            aria-label="Volver"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Crear reto</h1>
        </div>
        <Stepper step={step} total={4} />
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-6 gap-5">

        {/* ── Step 1: Type ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">¿Qué tipo de reto?</h2>
              <p className="text-sm opacity-60">Elige el formato que mejor te motive</p>
            </div>
            <div className="flex flex-col gap-3">
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
              className="w-full py-3.5 rounded-xl bg-(--color-primary) text-white font-semibold mt-2"
            >
              Continuar
            </button>
          </div>
        )}

        {/* ── Step 2: Config ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Detalles del reto</h2>
              <p className="text-sm opacity-60">Nombra el reto y define cuándo y cuánto</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest opacity-60">Título</label>
              <input
                value={step2.title}
                onChange={(e) => setStep2((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ej. Maratón de matemáticas"
                maxLength={80}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest opacity-60">
                Descripción <span className="opacity-50 normal-case">(opcional)</span>
              </label>
              <textarea
                value={step2.description}
                onChange={(e) => setStep2((s) => ({ ...s, description: e.target.value }))}
                placeholder="¿De qué se trata?"
                rows={2}
                maxLength={500}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-(--color-primary) resize-none"
              />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest opacity-60">Empieza</label>
                <DateTimePicker
                  value={step2.startsAt}
                  onChange={(v) => setStep2((s) => ({ ...s, startsAt: v }))}
                  minDate={todayDate()}
                  ariaLabelDate="Fecha de inicio"
                />
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest opacity-60">Termina</label>
                <DateTimePicker
                  value={step2.endsAt}
                  onChange={(v) => setStep2((s) => ({ ...s, endsAt: v }))}
                  minDate={todayDate()}
                  ariaLabelDate="Fecha de fin"
                />
              </div>
            </div>

            {showHoursTarget && (
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <label className="text-xs uppercase tracking-widest opacity-60 text-center">
                  Objetivo
                </label>
                <div className="flex justify-center">
                  <div className="w-24">
                    <WheelPicker
                      values={HOUR_VALUES}
                      value={step2.targetHours}
                      onChange={(h) => setStep2((s) => ({ ...s, targetHours: h }))}
                      suffix="h"
                      ariaLabel="Horas objetivo"
                    />
                  </div>
                </div>
              </div>
            )}

            {showDaysTarget && (
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <label className="text-xs uppercase tracking-widest opacity-60 text-center">
                  Días de racha
                </label>
                <div className="flex justify-center">
                  <div className="w-24">
                    <WheelPicker
                      values={STREAK_DAY_VALUES}
                      value={step2.targetDays}
                      onChange={(d) => setStep2((s) => ({ ...s, targetDays: d }))}
                      suffix="d"
                      ariaLabel="Días de racha"
                    />
                  </div>
                </div>
              </div>
            )}

            {step2Error && (
              <p className="text-sm text-red-400 text-center">{step2Error}</p>
            )}

            <button
              type="button"
              onClick={nextFromStep2}
              className="w-full py-3.5 rounded-xl bg-(--color-primary) text-white font-semibold"
            >
              Continuar
            </button>
          </div>
        )}

        {/* ── Step 3: Prizes ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">¿Qué está en juego?</h2>
              <p className="text-sm opacity-60">Lo que motiva a no aflojar</p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-(--color-primary)" />
                <label className="text-xs uppercase tracking-widest opacity-70">
                  Premio del ganador
                </label>
              </div>
              <input
                value={prizeWinner}
                onChange={(e) => setPrizeWinner(e.target.value)}
                placeholder="Cena, película, lo que sea..."
                maxLength={200}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <Frown size={16} className="opacity-70" />
                <label className="text-xs uppercase tracking-widest opacity-70">
                  Penitencia del perdedor <span className="normal-case opacity-60">(opcional)</span>
                </label>
              </div>
              <input
                value={prizeLoser}
                onChange={(e) => setPrizeLoser(e.target.value)}
                placeholder="Lavar los platos durante una semana..."
                maxLength={200}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
              />
            </div>

            <button
              type="button"
              disabled={!prizeWinner.trim()}
              onClick={() => setStep(4)}
              className="w-full py-3.5 rounded-xl bg-(--color-primary) text-white font-semibold disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        )}

        {/* ── Step 4: Friends ────────────────────────────────────────── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Invita a tus amigos</h2>
              <p className="text-sm opacity-60">
                {selectedFriendIds.length === 0
                  ? 'Selecciona los amigos que quieres invitar'
                  : `${selectedFriendIds.length} ${selectedFriendIds.length === 1 ? 'amigo seleccionado' : 'amigos seleccionados'}`}
              </p>
            </div>

            {friends.length > 4 && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  value={friendQuery}
                  onChange={(e) => setFriendQuery(e.target.value)}
                  placeholder="Buscar amigos..."
                  className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-(--color-primary)"
                />
              </div>
            )}

            {friends.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 opacity-50">
                <p className="text-sm">No tienes amigos agregados aún</p>
                <button
                  type="button"
                  onClick={() => navigate('/friends/add')}
                  className="text-xs text-(--color-primary) underline"
                >
                  Agregar amigos
                </button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-sm opacity-40 text-center py-4">Sin resultados</p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredFriends.map((entry) => {
                  const isSelected = selectedFriendIds.includes(entry.user.id)
                  return (
                    <button
                      key={entry.friendshipId}
                      type="button"
                      onClick={() => toggleFriend(entry.user.id)}
                      className={[
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        isSelected
                          ? 'border-(--color-primary) bg-(--color-primary)/10'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/5',
                      ].join(' ')}
                      aria-pressed={isSelected}
                    >
                      <Avatar
                        userId={entry.user.id}
                        avatar={entry.user.avatar}
                        avatarPreset={entry.user.avatarPreset}
                        displayName={entry.user.displayName}
                        className="w-9 h-9 shrink-0"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {entry.user.displayName}
                        </span>
                        {entry.user.friendCode && (
                          <span className="text-[11px] opacity-40 tabular-nums">
                            #{entry.user.friendCode}
                          </span>
                        )}
                      </div>
                      <div
                        className={[
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'bg-(--color-primary) border-(--color-primary)'
                            : 'border-white/20',
                        ].join(' ')}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <button
              type="button"
              onClick={onFinalSubmit}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-(--color-primary) text-white font-semibold disabled:opacity-60 mt-2"
            >
              {submitting ? 'Creando reto…' : 'Crear reto'}
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
