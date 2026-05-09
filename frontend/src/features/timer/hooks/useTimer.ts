// useTimer.ts — Core timer hook
//
// TEMP DEBUG helper — writes step messages to localStorage so the
// HomeTimerPage debug pill can display them without DevTools.
function dbg(msg: string) {
  try {
    const raw = localStorage.getItem('dbg:rehydrate') ?? '[]'
    const arr = JSON.parse(raw) as Array<{ ts: number; msg: string }>
    arr.push({ ts: Date.now(), msg })
    while (arr.length > 6) arr.shift()
    localStorage.setItem('dbg:rehydrate', JSON.stringify(arr))
  } catch {
    // ignore
  }
}

// Manages the 3 timer modes (stopwatch, countdown, pomodoro) with pause/resume/stop.
// State lives in zustand store (survives navigation), with localStorage for reload recovery.
// On stop: PATCH study_sessions with endedAt + durationSec, clear localStorage, reset store.
import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useTimerStore,
  ACTIVE_SESSION_KEY,
  type ActiveSessionData,
} from '../store'
import { createSession, endSession, getSession } from '../api/sessions'
import type { TimerMode } from '../api/sessions'
import type { PomodoroConfig } from '../schemas'
import pb from '@/shared/pb'
import {
  alertWorkPhaseEnded,
  alertBreakEnded,
  alertSessionComplete,
} from '@/shared/lib/alerts'

export interface StartOptions {
  /** For countdown mode: total seconds to count down from */
  targetSec?: number
  /** For pomodoro mode: work/break/cycle config */
  pomodoroConfig?: PomodoroConfig
  /** Optional subject id to tag the session with */
  subjectId?: string | null
}

export interface UseTimerOptions {
  /** Called when a countdown or pomodoro session naturally completes */
  onComplete?: () => void
}

/**
 * useTimer — primary timer hook.
 *
 * Returns state + control functions:
 *   status, mode, elapsedSec, remainingSec, currentCycle, isPaused, sessionId
 *   start(mode, options), pause(), resume(), stop(), reset()
 */
export function useTimer(options: UseTimerOptions = {}) {
  const store = useTimerStore()
  const queryClient = useQueryClient()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCompleteRef = useRef(options.onComplete)
  onCompleteRef.current = options.onComplete

  // Clear the tick interval
  const clearTick = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Persist active session to localStorage
  const persistSession = useCallback(() => {
    const state = useTimerStore.getState()
    if (!state.sessionId || !state.mode) return
    const data: ActiveSessionData = {
      sessionId: state.sessionId,
      mode: state.mode,
      startedAt: state.sessionStartedAt ?? Date.now(),
      totalPausedMs: state.totalPausedMs,
      pomodoroConfig: state.pomodoroConfig,
      targetSec: state.targetSec,
      currentCycle: state.currentCycle,
      pomodoroPhase: state.pomodoroPhase,
    }
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(data))
  }, [])

  // Main tick function — called every second
  const tick = useCallback(() => {
    const state = useTimerStore.getState()
    if (state.status !== 'running') return

    const now = Date.now()
    const startedAt = state.sessionStartedAt ?? now
    const effectiveElapsed = Math.floor((now - startedAt - state.totalPausedMs) / 1000)

    if (state.mode === 'stopwatch') {
      useTimerStore.getState().setElapsedSec(effectiveElapsed)
      return
    }

    if (state.mode === 'countdown') {
      const target = state.targetSec ?? 0
      const remaining = Math.max(0, target - effectiveElapsed)
      useTimerStore.getState().setRemainingSec(remaining)
      useTimerStore.getState().setElapsedSec(effectiveElapsed)
      if (remaining === 0) {
        clearTick()
        useTimerStore.getState().setStatus('completed')
        alertSessionComplete('countdown')
        onCompleteRef.current?.()
      }
      return
    }

    if (state.mode === 'pomodoro') {
      const cfg = state.pomodoroConfig
      if (!cfg) return

      const phaseDuration =
        state.pomodoroPhase === 'work' ? cfg.workMin * 60 : cfg.breakMin * 60

      // Elapsed within the current pomodoro phase — we need to track
      // phase start separately. Use elapsedSec as a phase-relative counter.
      const phaseElapsed = state.elapsedSec + 1
      const remaining = Math.max(0, phaseDuration - phaseElapsed)

      useTimerStore.getState().setElapsedSec(phaseElapsed)
      useTimerStore.getState().setRemainingSec(remaining)

      if (remaining === 0) {
        // Transition: work → break or break → next cycle / complete
        if (state.pomodoroPhase === 'work') {
          // Move to break — soft chime
          alertWorkPhaseEnded()
          useTimerStore.getState().setPomodoroPhase('break')
          useTimerStore.getState().setElapsedSec(0)
          useTimerStore.getState().setRemainingSec(cfg.breakMin * 60)
        } else {
          // End of break — move to next cycle
          const nextCycle = state.currentCycle + 1
          if (nextCycle > state.totalCycles) {
            // All cycles done — strong chime
            clearTick()
            useTimerStore.getState().setStatus('completed')
            alertSessionComplete('pomodoro')
            onCompleteRef.current?.()
          } else {
            // Next cycle starts — normal chime
            alertBreakEnded()
            useTimerStore.getState().setCurrentCycle(nextCycle)
            useTimerStore.getState().setPomodoroPhase('work')
            useTimerStore.getState().setElapsedSec(0)
            useTimerStore.getState().setRemainingSec(cfg.workMin * 60)
          }
        }
      }
    }
  }, [clearTick])

  // Start a new 1-second interval
  const startTick = useCallback(() => {
    clearTick()
    intervalRef.current = setInterval(tick, 1000)
  }, [clearTick, tick])

  // On mount: if the store is already in 'running' state (e.g. user navigated
  // from HomeTimerPage to /timer/active right after start()), make sure we
  // own a live tick. Without this, the previous component's unmount cleanup
  // kills the setInterval and the visual freezes until a manual pause/resume.
  // On unmount: clear our interval.
  useEffect(() => {
    if (useTimerStore.getState().status === 'running' && intervalRef.current == null) {
      startTick()
    }
    return () => {
      clearTick()
    }
  }, [clearTick, startTick])

  // Rehydrate active session from localStorage on mount.
  //
  // We restore the store OPTIMISTICALLY (synchronously from localStorage) and
  // verify against the server in the background.
  useEffect(() => {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY)
    dbg(`mount, ls=${raw ? 'yes' : 'no'}`)
    if (!raw) return

    if (!pb.authStore.isValid) {
      dbg('skip: auth invalid')
      return
    }
    if (useTimerStore.getState().status !== 'idle') {
      dbg('skip: status not idle')
      return
    }

    let data: ActiveSessionData
    try {
      data = JSON.parse(raw) as ActiveSessionData
    } catch {
      dbg('parse fail, clearing')
      localStorage.removeItem(ACTIVE_SESSION_KEY)
      return
    }

    dbg(`restore sid=${data.sessionId.slice(0,6)}`)

    // ── Step 1: optimistic local restore ────────────────────────────────
    const store = useTimerStore.getState()
    const now = Date.now()
    const elapsedSec = Math.floor((now - data.startedAt - data.totalPausedMs) / 1000)

    store.resetTimer()
    store.setMode(data.mode)
    store.setStatus('running')
    store.setSessionId(data.sessionId)
    store.setPomodoroConfig(data.pomodoroConfig)
    store.setTargetSec(data.targetSec)
    store.setSessionStartedAt(data.startedAt)
    store.setCurrentCycle(data.currentCycle)
    store.setPomodoroPhase(data.pomodoroPhase)
    store.setElapsedSec(elapsedSec)

    if (data.mode === 'countdown' && data.targetSec != null) {
      store.setRemainingSec(Math.max(0, data.targetSec - elapsedSec))
    }

    startTick()

    // ── Step 2: verify on server in the background ──────────────────────
    let cancelled = false

    void (async () => {
      const record = await getSession(data.sessionId)
      dbg(`verify ${record ? `endedAt=${record.endedAt === null ? 'null' : '"' + record.endedAt + '"'}` : 'NOT_FOUND'}`)
      if (cancelled) return

      if (!record || record.endedAt !== null) {
        dbg('teardown')
        clearTick()
        localStorage.removeItem(ACTIVE_SESSION_KEY)
        useTimerStore.getState().resetTimer()
      } else {
        dbg('verify ok')
      }
    })()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTick, clearTick])

  // --- Public API ---

  const start = useCallback(
    async (mode: TimerMode, opts: StartOptions = {}) => {
      clearTick()

      const pomodoroConfig = opts.pomodoroConfig ?? null
      const targetSec = opts.targetSec ?? null
      const totalCycles = pomodoroConfig?.cycles ?? 1
      const now = Date.now()

      // Create the PocketBase record first
      const sessionId = await createSession(mode, {
        pomodoroConfig: pomodoroConfig ?? undefined,
        targetSec: targetSec ?? undefined,
        subjectId: opts.subjectId ?? null,
      })

      // Initialize store
      const store = useTimerStore.getState()
      store.resetTimer()
      store.setMode(mode)
      store.setStatus('running')
      store.setSessionId(sessionId)
      store.setPomodoroConfig(pomodoroConfig)
      store.setTargetSec(targetSec)
      store.setSessionStartedAt(now)
      store.setCurrentCycle(1)
      store.setPomodoroPhase('work')

      if (mode === 'countdown' && targetSec != null) {
        store.setRemainingSec(targetSec)
      } else if (mode === 'pomodoro' && pomodoroConfig) {
        store.setRemainingSec(pomodoroConfig.workMin * 60)
        useTimerStore.setState({ totalCycles })
      }

      persistSession()
      startTick()
    },
    [clearTick, startTick, persistSession]
  )

  const pause = useCallback(() => {
    const state = useTimerStore.getState()
    if (state.status !== 'running') return

    clearTick()
    state.setStatus('paused')
    state.setIsPaused(true)
    state.setPauseStartedAt(Date.now())
    persistSession()
  }, [clearTick, persistSession])

  const resume = useCallback(() => {
    const state = useTimerStore.getState()
    if (state.status !== 'paused') return

    // Accumulate pause duration
    if (state.pauseStartedAt != null) {
      state.addPausedMs(Date.now() - state.pauseStartedAt)
    }
    state.setPauseStartedAt(null)
    state.setStatus('running')
    state.setIsPaused(false)

    // For stopwatch: update sessionStartedAt perspective by baking in the new
    // totalPausedMs — tick() does the math from sessionStartedAt - totalPausedMs
    persistSession()
    startTick()
  }, [startTick, persistSession])

  const stop = useCallback(async () => {
    const state = useTimerStore.getState()

    clearTick()

    const sessionId = state.sessionId
    const elapsedSec = state.elapsedSec

    if (sessionId) {
      // Compute effective duration — for pomodoro, use elapsedSec counter
      // For stopwatch/countdown, use elapsedSec which is wall-clock minus pauses
      await endSession(sessionId, elapsedSec)
    }

    localStorage.removeItem(ACTIVE_SESSION_KEY)
    useTimerStore.getState().resetTimer()

    // Invalidate caches that depend on session data so the home stats strip,
    // weekly goal progress and stats page refresh immediately after a session.
    queryClient.invalidateQueries({ queryKey: ['timer'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    queryClient.invalidateQueries({ queryKey: ['friends', 'weeklyRanking'] })
  }, [clearTick, queryClient])

  const reset = useCallback(() => {
    clearTick()
    localStorage.removeItem(ACTIVE_SESSION_KEY)
    useTimerStore.getState().resetTimer()
  }, [clearTick])

  return {
    status: store.status,
    mode: store.mode,
    elapsedSec: store.elapsedSec,
    remainingSec: store.remainingSec,
    currentCycle: store.currentCycle,
    pomodoroPhase: store.pomodoroPhase,
    isPaused: store.isPaused,
    sessionId: store.sessionId,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
