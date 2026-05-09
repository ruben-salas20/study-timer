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
 * Called when the user stops the timer.
 */
export async function endSession(id: string, durationSec: number): Promise<void> {
  await pb.collection('study_sessions').update(id, {
    endedAt: new Date().toISOString(),
    durationSec,
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
