// RegisterPage.tsx — T15
// Registration form with React Hook Form + Zod.
// On success → redirect to /onboarding/goal
// Layout ref: hifi-screens-1.jsx HFSignup
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { registerSchema, type RegisterInput } from '../schemas'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser, isRegisterPending, registerError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    try {
      await registerUser(data)
      navigate('/onboarding/goal')
    } catch {
      // error is captured by useAuth → registerError
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4">
        <Link
          to="/welcome"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-current opacity-60"
          aria-label="Volver"
        >
          ←
        </Link>
        <span className="text-sm opacity-60 font-medium">paso 1 de 3</span>
      </header>

      {/* Form content */}
      <main className="flex flex-col flex-1 px-6 pt-2 pb-10" role="main">
        <h1 className="text-2xl font-bold mb-1">¿Cómo te llamamos?</h1>
        <p className="text-sm opacity-60 mb-6">tu nombre lo verán tus amigos</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {/* displayName */}
          <div className="flex flex-col gap-1">
            <label htmlFor="displayName" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              aria-describedby={errors.displayName ? 'displayName-error' : undefined}
              {...register('displayName')}
              className="w-full px-4 py-3 rounded-xl border border-current/20 bg-transparent text-base outline-none focus:border-(--color-primary)"
            />
            {errors.displayName && (
              <span id="displayName-error" role="alert" className="text-sm text-red-500">
                {errors.displayName.message}
              </span>
            )}
          </div>

          {/* email */}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
              className="w-full px-4 py-3 rounded-xl border border-current/20 bg-transparent text-base outline-none focus:border-(--color-primary)"
            />
            {errors.email && (
              <span id="email-error" role="alert" className="text-sm text-red-500">
                {errors.email.message}
              </span>
            )}
          </div>

          {/* password */}
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
              className="w-full px-4 py-3 rounded-xl border border-current/20 bg-transparent text-base outline-none focus:border-(--color-primary)"
            />
            {errors.password && (
              <span id="password-error" role="alert" className="text-sm text-red-500">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* API error */}
          {registerError && (
            <div role="alert" className="text-sm text-red-500 text-center">
              {registerError instanceof Error
                ? registerError.message
                : 'Error al crear la cuenta. Intentá de nuevo.'}
            </div>
          )}

          <button
            type="submit"
            disabled={isRegisterPending}
            className="w-full py-3 px-6 rounded-xl font-semibold text-base bg-(--color-primary) text-white disabled:opacity-60 mt-2"
          >
            {isRegisterPending ? 'Creando cuenta...' : 'Continuar'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center opacity-60">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-(--color-primary) font-medium">
            Iniciá sesión
          </Link>
        </p>
      </main>
    </div>
  )
}
