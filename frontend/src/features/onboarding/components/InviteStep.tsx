// InviteStep.tsx — T20
// Displays user's friendCode + share/copy buttons.
// Layout ref: hifi-screens-1.jsx HFInvite
// RISK-5: navigator.share is guarded — fallback to clipboard if unavailable (HTTP dev env).
import { useState } from 'react'
import { Copy, Share2 } from 'lucide-react'

interface InviteStepProps {
  friendCode: string
  onSkip: () => void
  onComplete: () => Promise<void>
  isCompleting: boolean
}

export function InviteStep({ friendCode, onSkip, onComplete, isCompleting }: InviteStepProps) {
  const [copyFeedback, setCopyFeedback] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(friendCode)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // Clipboard API may be blocked — show the code prominently as fallback
    }
  }

  async function handleShare() {
    const shareData = {
      title: 'Cuyodoro',
      text: `¡Estudiemos juntos! Usá mi código de amigo: ${friendCode}`,
    }

    // RISK-5: navigator.share requires HTTPS — guard against HTTP dev env
    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share — that's fine
      }
    } else {
      // Fallback: copy to clipboard
      await handleCopy()
    }
  }

  return (
    <div className="flex flex-col flex-1 px-6 pt-2 pb-10">
      <h1 className="text-2xl font-bold mb-1">Invita amigos</h1>
      <p className="text-sm opacity-60 mb-6">estudiar es más divertido juntos</p>

      {/* Friend code card */}
      <div className="rounded-2xl bg-(--color-primary)/10 p-6 text-center mb-6">
        <p className="text-xs uppercase tracking-widest font-semibold opacity-60 mb-2">
          tu código
        </p>
        <p className="font-mono text-3xl font-bold tracking-[0.2em] my-3">
          {friendCode}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-current/30 text-sm font-medium"
          >
            <Copy size={14} />
            {copyFeedback ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-current/30 text-sm font-medium"
          >
            <Share2 size={14} />
            Compartir
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-auto">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 py-3 px-6 rounded-xl font-semibold text-base border border-current/30 opacity-70"
        >
          Saltar
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={isCompleting}
          className="flex-1 py-3 px-6 rounded-xl font-semibold text-base bg-(--color-primary) text-white disabled:opacity-60"
        >
          {isCompleting ? 'Guardando...' : 'Empezar'}
        </button>
      </div>
    </div>
  )
}
