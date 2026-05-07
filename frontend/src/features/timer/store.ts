// store.ts — Zustand timer store
// Holds all timer state so it survives navigation within the app.
// Does NOT survive full page reload (localStorage handles that separately).
import { create } from 'zustand'
import type { TimerMode } from './api/sessions'
import type { PomodoroConfig } from './schemas'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'

// Pomodoro sub-phase: work or break
export type PomodoroPhase = 'work' | 'break'

export interface TimerState {
  status: TimerStatus
  mode: TimerMode | null
  elapsedSec: number
  remainingSec: number
  currentCycle: number
  totalCycles: number
  pomodoroPhase: PomodoroPhase
  isPaused: boolean
  sessionId: string | null
  // Config carried from start()
  pomodoroConfig: PomodoroConfig | null
  targetSec: number | null
  // Pause bookkeeping
  pauseStartedAt: number | null   // timestamp when current pause began (ms)
  totalPausedMs: number           // accumulated paused milliseconds
  // Session wall-clock start for elapsed calc
  sessionStartedAt: number | null  // Date.now() when start() was called
}

export interface TimerActions {
  setStatus: (status: TimerStatus) => void
  setMode: (mode: TimerMode | null) => void
  setElapsedSec: (sec: number) => void
  setRemainingSec: (sec: number) => void
  setCurrentCycle: (cycle: number) => void
  setPomodoroPhase: (phase: PomodoroPhase) => void
  setIsPaused: (paused: boolean) => void
  setSessionId: (id: string | null) => void
  setPomodoroConfig: (config: PomodoroConfig | null) => void
  setTargetSec: (sec: number | null) => void
  setPauseStartedAt: (ts: number | null) => void
  addPausedMs: (ms: number) => void
  setSessionStartedAt: (ts: number | null) => void
  resetTimer: () => void
}

const initialState: TimerState = {
  status: 'idle',
  mode: null,
  elapsedSec: 0,
  remainingSec: 0,
  currentCycle: 1,
  totalCycles: 1,
  pomodoroPhase: 'work',
  isPaused: false,
  sessionId: null,
  pomodoroConfig: null,
  targetSec: null,
  pauseStartedAt: null,
  totalPausedMs: 0,
  sessionStartedAt: null,
}

export const useTimerStore = create<TimerState & TimerActions>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setMode: (mode) => set({ mode }),
  setElapsedSec: (elapsedSec) => set({ elapsedSec }),
  setRemainingSec: (remainingSec) => set({ remainingSec }),
  setCurrentCycle: (currentCycle) => set({ currentCycle }),
  setPomodoroPhase: (pomodoroPhase) => set({ pomodoroPhase }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setSessionId: (sessionId) => set({ sessionId }),
  setPomodoroConfig: (pomodoroConfig) => set({ pomodoroConfig }),
  setTargetSec: (targetSec) => set({ targetSec }),
  setPauseStartedAt: (pauseStartedAt) => set({ pauseStartedAt }),
  addPausedMs: (ms) => set((s) => ({ totalPausedMs: s.totalPausedMs + ms })),
  setSessionStartedAt: (sessionStartedAt) => set({ sessionStartedAt }),
  resetTimer: () => set({ ...initialState }),
}))

/** localStorage key for active session persistence */
export const ACTIVE_SESSION_KEY = 'studytimer:active-session'

export interface ActiveSessionData {
  sessionId: string
  mode: TimerMode
  startedAt: number       // Date.now() when started
  totalPausedMs: number
  pomodoroConfig: PomodoroConfig | null
  targetSec: number | null
  currentCycle: number
  pomodoroPhase: PomodoroPhase
}
