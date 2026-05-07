// WelcomePage.tsx — T14
// Landing screen for unauthenticated users.
// Layout ref: hifi-screens-1.jsx HFWelcome
// Pure presentation — no logic, just navigation.
import { useNavigate } from 'react-router-dom'
import { Timer } from 'lucide-react'

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
          {/* Logo / icon */}
          <div
            className="flex items-center justify-center w-36 h-36 rounded-[34px] bg-(--color-primary)/10"
            aria-hidden="true"
          >
            <Timer size={64} className="text-(--color-primary)" />
          </div>

          {/* Title + tagline */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground">Study Timer</h1>
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
