// ConfirmDialog.tsx — Accessible modal confirmation dialog
// Features: focus trap, Escape to cancel, ARIA attributes.
// Uses a portal-free approach — rendered inline via conditional in parent.
import { useEffect, useRef } from 'react'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Variant changes the confirm button color */
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Focus the cancel button when dialog opens
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus()
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // Focus trap: tab cycles between cancel and confirm
  function handleKeyDownTrap(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return

    const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
  }

  if (!isOpen) return null

  const confirmBtnClass =
    variant === 'danger'
      ? 'py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors active:scale-95'
      : 'py-2.5 rounded-xl bg-(--color-primary) text-white text-sm font-semibold hover:opacity-90 transition-colors active:scale-95'

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? 'confirm-desc' : undefined}
        onKeyDown={handleKeyDownTrap}
        className="bg-background text-foreground rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <h2 id="confirm-title" className="text-lg font-bold">
            {title}
          </h2>
          {description && (
            <p id="confirm-desc" className="text-sm opacity-60 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-current/20 text-sm font-medium opacity-70 hover:opacity-100 transition-opacity active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`flex-1 ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
