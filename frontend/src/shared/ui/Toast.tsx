// Toast.tsx — Toast notification display component
// Renders the list of active toasts from useToast.
// Position: fixed top-right, auto-dismiss 4s (managed by useToast).
import type { Toast as ToastItem } from '../hooks/useToast'

const TYPE_STYLES: Record<ToastItem['type'], string> = {
  success: 'bg-green-600/90 text-white',
  error: 'bg-red-600/90 text-white',
  info: 'bg-(--color-primary)/90 text-white',
  warning: 'bg-yellow-500/90 text-white',
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notificaciones"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={[
            'flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg',
            'text-sm font-medium pointer-events-auto',
            'animate-slide-in-right',
            TYPE_STYLES[t.type],
          ].join(' ')}
        >
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="opacity-70 hover:opacity-100 transition-opacity ml-1 text-lg leading-none"
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
