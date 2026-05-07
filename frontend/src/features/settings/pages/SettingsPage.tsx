// SettingsPage.tsx — T24 stub
// Placeholder for theme + accent settings.
// Full implementation in F5.
import { useAuth } from '@/features/auth/hooks/useAuth'
import pb from '@/shared/pb'

type Theme = 'auto' | 'light' | 'dark'
type AccentColor = 'sage' | 'blue' | 'warm' | 'mono'

export function SettingsPage() {
  const { user } = useAuth()

  async function handleThemeChange(theme: Theme) {
    if (!user?.id) return
    document.documentElement.dataset.theme = theme === 'auto' ? '' : theme
    await pb.collection('users').update(String(user.id), { theme })
  }

  async function handleAccentChange(accent: AccentColor) {
    if (!user?.id) return
    document.documentElement.dataset.accent = accent
    await pb.collection('users').update(String(user.id), { accentColor: accent })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground px-6 pt-10 pb-10">
      <h1 className="text-2xl font-bold mb-6">Ajustes</h1>

      {/* Theme select */}
      <section className="mb-6">
        <p className="text-sm font-semibold opacity-60 mb-2 uppercase tracking-widest">Tema</p>
        <div className="flex gap-3">
          {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => void handleThemeChange(t)}
              className={[
                'px-4 py-2 rounded-lg border text-sm font-medium capitalize',
                user?.theme === t
                  ? 'bg-(--color-primary) text-white border-(--color-primary)'
                  : 'border-current/30 opacity-70',
              ].join(' ')}
            >
              {t === 'auto' ? 'Auto' : t === 'light' ? 'Claro' : 'Oscuro'}
            </button>
          ))}
        </div>
      </section>

      {/* Accent select */}
      <section>
        <p className="text-sm font-semibold opacity-60 mb-2 uppercase tracking-widest">Acento</p>
        <div className="flex gap-3 flex-wrap">
          {(['sage', 'blue', 'warm', 'mono'] as AccentColor[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => void handleAccentChange(a)}
              className={[
                'px-4 py-2 rounded-lg border text-sm font-medium capitalize',
                user?.accentColor === a
                  ? 'bg-(--color-primary) text-white border-(--color-primary)'
                  : 'border-current/30 opacity-70',
              ].join(' ')}
            >
              {a}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
