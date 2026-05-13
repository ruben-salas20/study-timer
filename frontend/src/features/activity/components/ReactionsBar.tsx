// ReactionsBar.tsx — toggleable emoji reactions for a single feed event.
//
// Self-contained: holds optimistic local state so taps feel instant. Errors
// roll back. Parent owns the canonical summary (refetched after invalidation).
import { useState } from 'react'
import {
  REACTION_EMOJIS,
  addReaction,
  removeReaction,
  type EventReactionSummary,
} from '../api/reactions'

interface ReactionsBarProps {
  eventId: string
  initial: EventReactionSummary
  onChange?: () => void
}

export function ReactionsBar({ eventId, initial, onChange }: ReactionsBarProps) {
  const [summary, setSummary] = useState<EventReactionSummary>(initial)
  const [pending, setPending] = useState<Set<string>>(new Set())

  async function toggle(emoji: string) {
    if (pending.has(emoji)) return // ignore double-tap while in flight
    const myReactionId = summary.myReactionIds[emoji]
    const isRemoving = !!myReactionId

    // Optimistic update
    const prev = summary
    const next: EventReactionSummary = {
      counts: { ...summary.counts },
      myReactionIds: { ...summary.myReactionIds },
    }
    if (isRemoving) {
      next.counts[emoji] = Math.max(0, (next.counts[emoji] ?? 0) - 1)
      delete next.myReactionIds[emoji]
    } else {
      next.counts[emoji] = (next.counts[emoji] ?? 0) + 1
      next.myReactionIds[emoji] = '_pending'
    }
    setSummary(next)
    setPending((s) => new Set(s).add(emoji))

    try {
      if (isRemoving) {
        await removeReaction(myReactionId)
      } else {
        const newId = await addReaction(eventId, emoji)
        setSummary((cur) => ({
          counts: cur.counts,
          myReactionIds: { ...cur.myReactionIds, [emoji]: newId },
        }))
      }
      onChange?.()
    } catch (err) {
      console.error('[ReactionsBar] toggle failed:', err)
      setSummary(prev)
    } finally {
      setPending((s) => {
        const copy = new Set(s)
        copy.delete(emoji)
        return copy
      })
    }
  }

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_EMOJIS.map((emoji) => {
        const count = summary.counts[emoji] ?? 0
        const mine = !!summary.myReactionIds[emoji]
        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void toggle(emoji)
            }}
            disabled={pending.has(emoji)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs leading-none border transition-colors disabled:opacity-50"
            style={{
              background: mine ? 'color-mix(in srgb, var(--color-primary) 18%, transparent)' : 'transparent',
              borderColor: mine ? 'color-mix(in srgb, var(--color-primary) 50%, transparent)' : 'rgba(127,127,127,0.25)',
            }}
            aria-label={`Reaccionar con ${emoji}`}
            aria-pressed={mine}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && <span className="tabular-nums opacity-80">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
