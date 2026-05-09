// WelcomePage.tsx — Landing screen for unauthenticated users.
import { useNavigate } from 'react-router-dom'

export function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main
        className="flex flex-col flex-1 items-center justify-between px-7 py-10"
        role="main"
      >
        {/* Hero area */}
        <div className="flex flex-col flex-1 items-center justify-center gap-8">
          {/* Logo — uses the precompressed PWA icon (298 KB) instead of
              the original logo.png (4.6 MB) so welcome loads fast. */}
          <img
            src="/icons/icon-512x512.png"
            alt="Cuyodoro"
            className="w-40 h-40 rounded-[34px] object-contain"
          />

          {/* Title + tagline */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground">Cuyodoro</h1>
            <p className="mt-2 text-base leading-relaxed opacity-60 max-w-[280px]">
              Estudia con tus amigos.
              <br />
              Compite. Mejora la racha.
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full py-3 px-6 rounded-xl font-semibold text-base bg-(--color-primary) text-white"
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 px-6 rounded-xl font-semibold text-base border border-current opacity-70"
          >
            Ya tengo cuenta
          </button>
        </div>
      </main>
    </div>
  )
}
