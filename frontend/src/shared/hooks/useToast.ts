// useToast.ts — Minimal toast queue hook
// Auto-dismisses each toast after 4 seconds.
// Pure React state — no global store needed.
import { useState, useCallback, useEffect, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

export interface AddToastOptions {
  message: string
  type: ToastType
}

let _idCounter = 0
function nextId(): string {
  _idCounter += 1
  return `toast-${_idCounter}`
}

const AUTO_DISMISS_MS = 4000

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer != null) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (options: AddToastOptions) => {
      const id = nextId()
      const newToast: Toast = { id, message: options.message, type: options.type }

      setToasts((prev) => [...prev, newToast])

      const timer = setTimeout(() => {
        dismiss(id)
      }, AUTO_DISMISS_MS)

      timersRef.current.set(id, timer)
    },
    [dismiss]
  )

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
    }
  }, [])

  return { toasts, toast, dismiss }
}
