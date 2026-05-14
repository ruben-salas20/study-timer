// offlineOutbox.ts — durable queue for session create/end operations that
// couldn't reach the backend because the device was offline.
//
// Flow:
//   - When useTimer.start runs and the network is unavailable, it enqueues
//     a "create" entry and returns a local-only tempId (prefix "offline-").
//     The timer keeps running with the temp id in localStorage.
//   - When useTimer.stop runs offline, it enqueues an "end" entry referenced
//     by whatever id is in the store (temp or real).
//   - flush() drains the queue in FIFO order. On each successful create, it
//     publishes a tempId → realId mapping via the onRemap callback so the
//     active timer store (and the localStorage rehydrate blob) can be
//     updated to point at the real record. End entries that still reference
//     a temp id get translated through the mapping at replay time.
//   - The server hook on-session-create unconditionally overrides startedAt
//     with the server clock, which would mis-bucket replayed sessions to
//     the moment they were synced rather than when they really happened.
//     We compensate by following each successful create with a PATCH that
//     restores the client's original startedAt.

import pb from '@/shared/pb'
import type { PomodoroConfig } from '../schemas'

const STORAGE_KEY = 'cuyodoro:offline-outbox:v1'

export type TimerMode = 'pomodoro' | 'stopwatch' | 'countdown'

interface CreatePayload {
  mode: TimerMode
  pomodoroConfig?: PomodoroConfig | null
  targetSec?: number | null
  subjectId?: string | null
  /** Local-time ISO when the user actually pressed Start. */
  clientStartedAt: string
}

interface CreateEntry extends CreatePayload {
  kind: 'create'
  tempId: string
  enqueuedAt: number
}

interface EndEntry {
  kind: 'end'
  /** Could be a tempId at queue time; resolved to realId at flush time
   *  through the mapping built by earlier create entries. */
  sessionId: string
  durationSec: number
  /** Local-time ISO when the user pressed Stop. */
  endedAt: string
  enqueuedAt: number
}

type OutboxEntry = CreateEntry | EndEntry

// ── Storage helpers ────────────────────────────────────────────────────────

function readQueue(): OutboxEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as OutboxEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(entries: OutboxEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    if (entries.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    }
  } catch {
    // localStorage quota / disabled — silently drop. Worst case the outbox
    // resets; the user's local timer state is still intact.
  }
}

function genTempId(): string {
  // 9 random base36 chars → ~46 bits of entropy. Plenty for uniqueness
  // across a single device's offline sessions. The `offline-` prefix lets
  // every layer recognise local-only ids at a glance.
  const r = Math.random().toString(36).slice(2, 7)
  return `offline-${Date.now().toString(36)}${r}`
}

// ── Public API ─────────────────────────────────────────────────────────────

export function isTempId(id: string): boolean {
  return id.startsWith('offline-')
}

/** Has the outbox got pending entries right now? */
export function hasPending(): boolean {
  return readQueue().length > 0
}

/**
 * enqueueCreate — register a session-create that couldn't reach the server.
 * Returns the tempId the caller should use as the live sessionId.
 */
export function enqueueCreate(payload: CreatePayload): string {
  const tempId = genTempId()
  const entry: CreateEntry = {
    kind: 'create',
    tempId,
    enqueuedAt: Date.now(),
    ...payload,
  }
  const queue = readQueue()
  queue.push(entry)
  writeQueue(queue)
  return tempId
}

/** enqueueEnd — register a session-end that couldn't reach the server. */
export function enqueueEnd(
  sessionId: string,
  durationSec: number,
  endedAt: string
): void {
  const entry: EndEntry = {
    kind: 'end',
    sessionId,
    durationSec,
    endedAt,
    enqueuedAt: Date.now(),
  }
  const queue = readQueue()
  queue.push(entry)
  writeQueue(queue)
}

/**
 * flush — drain queued entries in order. Calls `onRemap(tempId, realId)`
 * whenever a create entry succeeds so callers can update the active timer
 * store / localStorage blob to point at the real record. Stops at the
 * first failure so retries don't reorder later entries.
 *
 * Returns the number of entries that were successfully drained.
 */
export async function flush(
  onRemap?: (tempId: string, realId: string) => void
): Promise<number> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0
  if (!pb.authStore.isValid) return 0

  const remapping = new Map<string, string>()
  let drained = 0

  // We mutate a working copy as we go so a partial failure only leaves
  // future entries pending.
  let queue = readQueue()
  while (queue.length > 0) {
    const entry = queue[0]
    try {
      if (entry.kind === 'create') {
        const user = pb.authStore.model
        if (!user?.id) break
        const record = await pb.collection('study_sessions').create({
          user: user.id,
          mode: entry.mode,
          startedAt: entry.clientStartedAt,
          durationSec: 0,
          pomodoroConfig: entry.pomodoroConfig ?? null,
          targetSec: entry.targetSec ?? null,
          subject: entry.subjectId ?? null,
        })
        const realId = record.id as string

        // Server hook just overrode startedAt with the moment of replay;
        // patch it back to the user's real local start time so day-
        // bucketed stats line up with reality.
        try {
          await pb.collection('study_sessions').update(realId, {
            startedAt: entry.clientStartedAt,
          })
        } catch {
          // Non-fatal — record exists with the wrong startedAt but the
          // session still counts toward totals.
        }

        remapping.set(entry.tempId, realId)
        onRemap?.(entry.tempId, realId)
      } else {
        // 'end' entry
        const realId = remapping.get(entry.sessionId) ?? entry.sessionId
        // Skip silently if we still don't have a real id (the matching
        // create hasn't been drained — should not happen in FIFO order).
        if (isTempId(realId)) {
          break
        }
        await pb.collection('study_sessions').update(realId, {
          endedAt: entry.endedAt,
          durationSec: entry.durationSec,
        })
      }

      // Successful — drop from disk and continue.
      queue.shift()
      writeQueue(queue)
      drained++
      // Re-read in case another tab also flushed concurrently.
      queue = readQueue()
    } catch (err) {
      // Network or auth blip — stop here, try again on the next flush.
      console.warn('[offlineOutbox] flush stopped at entry:', entry.kind, err)
      break
    }
  }

  return drained
}
