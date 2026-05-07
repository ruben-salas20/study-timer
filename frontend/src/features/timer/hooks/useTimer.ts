// useTimer.ts — Core timer hook
// Manages the 3 timer modes (stopwatch, countdown, pomodoro) with pause/resume/stop.
// State lives in zustand store (survives navigation), with localStorage for reload recovery.
// On stop: PATCH study_sessions with endedAt + durationSec, clear localStorage, reset store.
import { useEffect, useRef, useCallback } from 'react'
import {
  useTimerStore,
  ACTIVE_SESSION_KEY,
  type ActiveSessionData,
} from '../store'
import { createSession, endSession } from '../api/sessions'
import type { TimerMode } from '../api/sessions'
import type { PomodoroConfig } from '../schemas'

export interface StartOptions {
  /** For countdown mode: total seconds to count down from */
  targetSec?: number
  /** For pomodoro mode: work/break/cycle config */
  pomodoroConfig?: PomodoroConfig
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
          // Move to break
          useTimerStore.getState().setPomodoroPhase('break')
          useTimerStore.getState().setElapsedSec(0)
          useTimerStore.getState().setRemainingSec(cfg.breakMin * 60)
        } else {
          // End of break — move to next cycle
          const nextCycle = state.currentCycle + 1
          if (nextCycle > state.totalCycles) {
            // All cycles done
            clearTick()
            useTimerStore.getState().setStatus('completed')
            onCompleteRef.current?.()
          } else {
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

  // On unmount, clear the interval
  useEffect(() => {
    return () => {
      clearTick()
    }
  }, [clearTick])

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
  }, [clearTick])

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
    isPaused: store.isPaused,
    sessionId: store.sessionId,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
