// ProfilePage.tsx — F5 user profile screen at /profile
// Avatar placeholder (initials), displayName edit, weeklyGoal slider modal,
// password change modal, account info.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { updateProfile, changePassword } from '../api/profile'
import { displayNameSchema, weeklyGoalSchema, passwordChangeSchema } from '../schemas'
import type { PasswordChangeInput } from '../schemas'
import { BottomNav } from '@/shared/ui/BottomNav'

// ── Avatar initials helper ────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AvatarCircle({ name }: { name: string }) {
  return (
    <div className="w-20 h-20 rounded-full bg-(--color-primary) flex items-center justify-center">
      <span className="text-3xl font-bold text-white tabular-nums">
        {getInitials(name)}
      </span>
    </div>
  )
}

// ── Password change modal ─────────────────────────────────────────────────────

interface PasswordModalProps {
  onClose: () => void
}

function PasswordModal({ onClose }: PasswordModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<PasswordChangeInput>({
      resolver: zodResolver(passwordChangeSchema),
    })

  async function onSubmit(data: PasswordChangeInput) {
    setServerError(null)
    try {
      await changePassword(data.currentPassword, data.newPassword)
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch {
      setServerError('Contraseña actual incorrecta')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
      <div className="bg-background rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold">Cambiar contraseña</h2>

        {success ? (
          <p className="text-sm text-(--color-primary) font-medium">
            Contraseña actualizada correctamente.
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-3">
            <div>
              <input
                {...register('currentPassword')}
                type="password"
                placeholder="Contraseña actual"
                autoComplete="current-password"
                className="w-full rounded-xl border border-current/20 bg-background px-4 py-2 text-sm"
              />
              {errors.currentPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>
              )}
            </div>
            <div>
              <input
                {...register('newPassword')}
                type="password"
                placeholder="Nueva contraseña"
                autoComplete="new-password"
                className="w-full rounded-xl border border-current/20 bg-background px-4 py-2 text-sm"
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="Confirmá la contraseña"
                autoComplete="new-password"
                className="w-full rounded-xl border border-current/20 bg-background px-4 py-2 text-sm"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            {serverError && (
              <p className="text-xs text-red-500">{serverError}</p>
            )}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-current/20 text-sm opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-xl bg-(--color-primary) text-white text-sm font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Weekly goal slider modal ──────────────────────────────────────────────────

interface GoalModalProps {
  initial: number
  onClose: () => void
  onSave: (minutes: number) => Promise<void>
}

function GoalModal({ initial, onClose, onSave }: GoalModalProps) {
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  const parsed = weeklyGoalSchema.safeParse(value)

  async function handleSave() {
    if (!parsed.success) return
    setSaving(true)
    await onSave(value)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
      <div className="bg-background rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold">Objetivo semanal</h2>
        <p className="text-2xl font-bold tabular-nums text-(--color-primary)">{value}min</p>
        <input
          type="range"
          min={30}
          max={4200}
          step={30}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)]"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-current/20 text-sm opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !parsed.success}
            className="flex-1 py-2 rounded-xl bg-(--color-primary) text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [editingName, setEditingName] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const displayName = (user?.displayName as string | undefined) ?? ''
  const friendCode = (user?.friendCode as string | undefined) ?? '------'
  const weeklyGoal = (user?.weeklyGoalMinutes as number | undefined) ?? 300
  const email = (user?.email as string | undefined) ?? ''
  const created = user?.created
    ? new Date(user.created as string).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  // displayName inline edit form
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ displayName: string }>({
    defaultValues: { displayName },
  })

  const displayNameParsed = displayNameSchema.safeParse

  async function onNameSubmit(data: { displayName: string }) {
    const parsed = displayNameSchema.safeParse(data.displayName)
    if (!parsed.success) return
    await updateProfile({ displayName: data.displayName })
    void queryClient.invalidateQueries({ queryKey: ['auth', 'currentUser'] })
    setEditingName(false)
  }

  async function copyFriendCode() {
    await navigator.clipboard.writeText(friendCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function saveGoal(minutes: number) {
    await updateProfile({ weeklyGoalMinutes: minutes })
    void queryClient.invalidateQueries({ queryKey: ['auth', 'currentUser'] })
  }

  // Suppress unused warning — used in template
  void displayNameParsed

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground">
      <header className="px-6 pt-10 pb-4">
        <h1 className="text-2xl font-bold">Perfil</h1>
      </header>

      <main className="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-4 gap-6">

        {/* ── Avatar + name ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 py-4">
          <AvatarCircle name={displayName || '?'} />

          {editingName ? (
            <form
              onSubmit={(e) => void handleSubmit(onNameSubmit)(e)}
              className="flex gap-2 items-center"
            >
              <input
                {...register('displayName')}
                autoFocus
                className="rounded-xl border border-(--color-primary) px-3 py-1 text-center font-semibold text-lg bg-background"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-sm text-(--color-primary) font-medium"
              >
                {isSubmitting ? '...' : 'OK'}
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className="text-sm opacity-50"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-xl font-bold hover:text-(--color-primary) transition-colors"
            >
              {displayName} ✏️
            </button>
          )}

          {/* Friend code */}
          <button
            type="button"
            onClick={() => void copyFriendCode()}
            className="flex items-center gap-2 rounded-full bg-current/5 px-4 py-1.5 text-sm font-mono"
            title="Copiar código"
          >
            {friendCode}
            <span className="text-xs opacity-50">{copied ? '✓' : '⎘'}</span>
          </button>
        </div>

        {/* ── Weekly goal ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between rounded-xl border border-current/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Objetivo semanal</p>
              <p className="text-xl font-bold tabular-nums text-(--color-primary)">{weeklyGoal}min</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGoalModal(true)}
              className="text-sm text-(--color-primary) font-medium"
            >
              Editar
            </button>
          </div>
        </section>

        {/* ── Security ──────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
            Seguridad
          </p>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between rounded-xl border border-current/20 px-4 py-3 text-sm"
          >
            <span>Cambiar contraseña</span>
            <span className="opacity-40">→</span>
          </button>
        </section>

        {/* ── Account info ─────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
            Cuenta
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between py-2 border-b border-current/10">
              <span className="opacity-60">Email</span>
              <span className="font-medium truncate max-w-[60%]">{email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="opacity-60">Miembro desde</span>
              <span className="font-medium">{created}</span>
            </div>
          </div>
        </section>
      </main>

      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      {showGoalModal && (
        <GoalModal
          initial={weeklyGoal}
          onClose={() => setShowGoalModal(false)}
          onSave={saveGoal}
        />
      )}

      <BottomNav />
    </div>
  )
}
