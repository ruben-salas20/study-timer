// FriendCodeCard.tsx — Reusable card showing the user's friendCode
// with copy + share buttons. Extracted from onboarding/InviteStep
// to be reused in AddFriendPage.
import { useState } from 'react'
import { Copy, Share2 } from 'lucide-react'

interface FriendCodeCardProps {
  friendCode: string
}

export function FriendCodeCard({ friendCode }: FriendCodeCardProps) {
  const [copyFeedback, setCopyFeedback] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(friendCode)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // Clipboard API may be blocked — the code is visible as fallback
    }
  }

  async function handleShare() {
    const shareData = {
      title: 'Study Timer',
      text: `¡Estudiemos juntos! Usá mi código de amigo: ${friendCode}`,
    }

    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share
      }
    } else {
      await handleCopy()
    }
  }

  return (
    <div className="rounded-2xl bg-(--color-primary)/10 p-6 text-center">
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
  )
}
