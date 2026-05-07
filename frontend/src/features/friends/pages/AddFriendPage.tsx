// AddFriendPage.tsx — Add a friend by their 6-char code, at /friends/add
// Two sections:
//   1. "Tu código" — show current user's friendCode with copy + share
//   2. "Agregar por código" — RHF + Zod form, calls sendFriendRequest
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSendFriendRequest } from '../hooks/useFriends'
import { friendCodeSchema } from '../schemas'
import { FriendCodeCard } from './FriendCodeCard'

// ── Form schema ───────────────────────────────────────────────────────────────

const addFriendFormSchema = z.object({
  friendCode: friendCodeSchema,
})

type AddFriendForm = z.infer<typeof addFriendFormSchema>

// ── Page ─────────────────────────────────────────────────────────────────────

export function AddFriendPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const sendRequest = useSendFriendRequest()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddFriendForm>({
    resolver: zodResolver(addFriendFormSchema),
  })

  async function onSubmit(data: AddFriendForm) {
    setSuccessMsg(null)
    try {
      await sendRequest.mutateAsync(data.friendCode)
      setSuccessMsg(`¡Solicitud enviada a ${data.friendCode}!`)
      reset()
    } catch (err) {
      // Error is shown via sendRequest.error
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 pt-10 pb-4">
        <Link
          to="/friends"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-current/20"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">Agregar amigo</h1>
      </header>

      <main className="flex flex-col flex-1 px-6 pb-10 gap-8">

        {/* ── Tu código ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">
            Tu código
          </h2>
          <FriendCodeCard friendCode={String(user?.friendCode ?? '------')} />
        </section>

        {/* ── Agregar por código ───────────────────────────────────────── */}
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">
            Agregar por código
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <input
                {...register('friendCode')}
                type="text"
                placeholder="Ej: ABC123"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full rounded-xl border border-current/20 bg-(--color-surface-raised) px-4 py-3 font-mono text-center text-xl tracking-[0.25em] uppercase placeholder:opacity-30 placeholder:tracking-normal placeholder:font-sans placeholder:text-base focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
                aria-label="Código de amigo"
              />
              {errors.friendCode && (
                <p className="text-xs text-red-500 text-center">
                  {errors.friendCode.message}
                </p>
              )}
            </div>

            {/* Toast-style feedback */}
            {successMsg && (
              <p className="text-sm text-center text-green-600 font-medium">
                {successMsg}
              </p>
            )}
            {sendRequest.error && (
              <p className="text-sm text-center text-red-500">
                {sendRequest.error instanceof Error
                  ? sendRequest.error.message
                  : 'Error desconocido'}
              </p>
            )}

            <button
              type="submit"
              disabled={sendRequest.isPending}
              className="w-full py-3 rounded-xl font-semibold text-base bg-(--color-primary) text-white disabled:opacity-60 transition-opacity"
            >
              {sendRequest.isPending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
