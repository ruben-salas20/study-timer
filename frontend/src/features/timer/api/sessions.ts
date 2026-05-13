// sessions.ts — Timer sessions API layer
// Wraps PocketBase SDK calls for study_sessions collection.
import pb from '@/shared/pb'
import type { PomodoroConfig } from '../schemas'

export type TimerMode = 'pomodoro' | 'stopwatch' | 'countdown'

export interface CreateSessionOptions {
  pomodoroConfig?: PomodoroConfig
  targetSec?: number
  /** Optional subject id to tag the session with. */
  subjectId?: string | null
}

/**
 * createSession — create a new study_sessions record.
 * The server hook (on-session-create.js) will override startedAt with the
 * server time. durationSec defaults to 0.
 * Returns the new session id.
 */
export async function createSession(
  mode: TimerMode,
  config?: CreateSessionOptions
): Promise<string> {
  const user = pb.authStore.model
  const record = await pb.collection('study_sessions').create({
    user: user?.id,
    mode,
    startedAt: new Date().toISOString(),
    durationSec: 0,
    pomodoroConfig: config?.pomodoroConfig ?? null,
    targetSec: config?.targetSec ?? null,
    subject: config?.subjectId ?? null,
  })
  return record.id
}

/**
 * endSession — PATCH the session record with endedAt and durationSec.
 * Called when the user stops the timer. Notes are written separately via
 * `updateSessionNotes` from the session-summary screen so the stop flow stays
 * fast even when the network is slow.
 */
export async function endSession(id: string, durationSec: number): Promise<void> {
  await pb.collection('study_sessions').update(id, {
    endedAt: new Date().toISOString(),
    durationSec,
  })
}

/**
 * updateSessionNotes — PATCH only the `notes` field of a session.
 * Used by the post-stop summary screen and by editing notes from /stats.
 */
export async function updateSessionNotes(id: string, notes: string): Promise<void> {
  await pb.collection('study_sessions').update(id, {
    notes: notes.slice(0, 500),
  })
}

export interface SessionSummary {
  id: string
  mode: TimerMode
  startedAt: string
  endedAt: string | null
  durationSec: number
  notes: string
  subjectId: string | null
}

/**
 * getSessionSummary — fetch a single session for the summary/edit screen.
 * Returns null if not found or the user can't access it.
 */
export async function getSessionSummary(id: string): Promise<SessionSummary | null> {
  try {
    const record = await pb.collection('study_sessions').getOne(id, {
      requestKey: `session-summary-${id}`,
    })
    const rawEnded = record['endedAt'] as string | null | undefined
    return {
      id: record.id,
      mode: record['mode'] as TimerMode,
      startedAt: record['startedAt'] as string,
      endedAt: rawEnded && rawEnded !== '' ? rawEnded : null,
      durationSec: (record['durationSec'] as number) ?? 0,
      notes: (record['notes'] as string | undefined) ?? '',
      subjectId: (record['subject'] as string | undefined) || null,
    }
  } catch {
    return null
  }
}

/**
 * listRecentSessions — last N completed sessions for the current user,
 * ordered by start time descending. Used by /stats "Sesiones recientes".
 */
export async function listRecentSessions(limit = 10): Promise<SessionSummary[]> {
  const user = pb.authStore.model
  if (!user?.id) return []
  const result = await pb.collection('study_sessions').getList(1, limit, {
    filter: `user = "${user.id}" && endedAt != ""`,
    sort: '-startedAt',
    requestKey: 'sessions-recent',
  })
  return result.items.map((item) => {
    const rawEnded = item['endedAt'] as string | null | undefined
    return {
      id: item.id,
      mode: item['mode'] as TimerMode,
      startedAt: item['startedAt'] as string,
      endedAt: rawEnded && rawEnded !== '' ? rawEnded : null,
      durationSec: (item['durationSec'] as number) ?? 0,
      notes: (item['notes'] as string | undefined) ?? '',
      subjectId: (item['subject'] as string | undefined) || null,
    }
  })
}

/**
 * getSession — fetch a single study_sessions record by id.
 * Used for rehydration: verify the session is still active (endedAt is empty).
 *
 * IMPORTANT: PocketBase returns empty STRING ("") for unset datetime fields,
 * not null. We normalise both "" and null/undefined to `null` here so callers
 * can simply check `record.endedAt === null` to mean "still active". The
 * previous version returned "" through and the caller's `!== null` check
 * always evaluated true, which made the rehydrate flow consistently believe
 * every active session had already ended and tear down localStorage.
 *
 * Returns null if the record does not exist or fetch fails.
 */
export async function getSession(id: string): Promise<{ id: string; endedAt: string | null; startedAt: string } | null> {
  try {
    // PB SDK auto-cancels duplicate concurrent requests sharing the same
    // URL+method. Other code (e.g. ActiveSessionBanner) also fetches this
    // record, which used to silently cancel our rehydrate-verify call and
    // make the hook think the session no longer existed. Using a unique
    // requestKey opts this call out of the auto-cancel group.
    const record = await pb.collection('study_sessions').getOne(id, {
      requestKey: `session-verify-${id}`,
    })
    const rawEnded = record['endedAt'] as string | null | undefined
    return {
      id: record.id,
      endedAt: rawEnded && rawEnded !== '' ? rawEnded : null,
      startedAt: record['startedAt'] as string,
    }
  } catch {
    return null
  }
}

/**
 * listMySessions — fetch this user's sessions with optional filters.
 * Used for stats and history display.
 */
export async function listMySessions(opts?: {
  page?: number
  perPage?: number
  filter?: string
}) {
  return pb.collection('study_sessions').getList(
    opts?.page ?? 1,
    opts?.perPage ?? 50,
    {
      filter: opts?.filter,
      sort: '-startedAt',
    }
  )
}
