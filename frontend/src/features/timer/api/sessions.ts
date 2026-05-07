// sessions.ts — Timer sessions API layer
// Wraps PocketBase SDK calls for study_sessions collection.
import pb from '@/shared/pb'
import type { PomodoroConfig } from '../schemas'

export type TimerMode = 'pomodoro' | 'stopwatch' | 'countdown'

export interface CreateSessionOptions {
  pomodoroConfig?: PomodoroConfig
  targetSec?: number
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
