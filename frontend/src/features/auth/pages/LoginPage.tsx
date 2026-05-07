// LoginPage.tsx — T16
// Login form with React Hook Form + Zod.
// On success → redirect to /home
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { loginSchema, type LoginInput } from '../schemas'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login: loginUser, isLoginPending, loginError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    try {
      await loginUser(data)
      navigate('/home')
    } catch {
      // error captured by useAuth → loginError
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
      </header>

      {/* Form content */}
      <main className="flex flex-col flex-1 px-6 pt-2 pb-10" role="main">
        <h1 className="text-2xl font-bold mb-1">Iniciar sesión</h1>
        <p className="text-sm opacity-60 mb-6">bienvenido de nuevo</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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
              autoComplete="current-password"
              placeholder="Tu contraseña"
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
          {loginError && (
            <div role="alert" className="text-sm text-red-500 text-center">
              {loginError instanceof Error
                ? loginError.message
                : 'Email o contraseña incorrectos.'}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoginPending}
            className="w-full py-3 px-6 rounded-xl font-semibold text-base bg-(--color-primary) text-white disabled:opacity-60 mt-2"
          >
            {isLoginPending ? 'Iniciando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center opacity-60">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-(--color-primary) font-medium">
            Creá una
          </Link>
        </p>
      </main>
    </div>
  )
}
