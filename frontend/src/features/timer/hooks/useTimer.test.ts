// useTimer.test.ts — RED tests for useTimer hook (TDD cycle)
// Tests the core timer logic: tick behavior, mode transitions, pause/resume, stop.
// Also tests localStorage rehydration on mount (F8 carry-over).
// Uses vi.useFakeTimers() to control setInterval ticks deterministically.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock sessions API — we do not want real HTTP in unit tests
vi.mock('../api/sessions', () => ({
  createSession: vi.fn().mockResolvedValue('session-test-id'),
  endSession: vi.fn().mockResolvedValue(undefined),
  listMySessions: vi.fn().mockResolvedValue({ items: [] }),
  getSession: vi.fn().mockResolvedValue(null),
}))

// Mock PocketBase singleton (needed by the zustand store import chain)
vi.mock('@/shared/pb', () => ({
  default: {
    authStore: {
      model: { id: 'user-123', displayName: 'Test User' },
      isValid: true,
      onChange: vi.fn(() => () => {}),
    },
    collection: vi.fn().mockReturnValue({
      create: vi.fn().mockResolvedValue({ id: 'session-test-id' }),
      update: vi.fn().mockResolvedValue({}),
      getList: vi.fn().mockResolvedValue({ items: [] }),
    }),
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useTimer hook', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset zustand store to idle between tests so rehydration guard works correctly
    const { useTimerStore } = await import('../store')
    useTimerStore.getState().resetTimer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('stopwatch mode', () => {
    it('starts with status idle', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())
      expect(result.current.status).toBe('idle')
    })

    it('counts up from 0 after start(stopwatch)', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('stopwatch')
      })

      expect(result.current.status).toBe('running')
      expect(result.current.elapsedSec).toBe(0)

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(result.current.elapsedSec).toBe(3)
    })

    it('continues counting up after multiple ticks', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('stopwatch')
      })

      act(() => { vi.advanceTimersByTime(10000) })

      expect(result.current.elapsedSec).toBe(10)
    })
  })

  describe('countdown mode', () => {
    it('counts down from targetSec to 0', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('countdown', { targetSec: 5 })
      })

      expect(result.current.status).toBe('running')
      expect(result.current.remainingSec).toBe(5)

      act(() => { vi.advanceTimersByTime(3000) })
      expect(result.current.remainingSec).toBe(2)

      act(() => { vi.advanceTimersByTime(2000) })
      expect(result.current.remainingSec).toBe(0)
    })

    it('fires onComplete when countdown reaches 0', async () => {
      const onComplete = vi.fn()
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer({ onComplete }))

      await act(async () => {
        await result.current.start('countdown', { targetSec: 3 })
      })

      act(() => { vi.advanceTimersByTime(3000) })

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(result.current.status).toBe('completed')
    })
  })

  describe('pomodoro mode', () => {
    it('starts in work phase', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('pomodoro', {
          pomodoroConfig: { workMin: 1, breakMin: 1, cycles: 2 },
        })
      })

      expect(result.current.status).toBe('running')
      expect(result.current.currentCycle).toBe(1)
      // remainingSec should be workMin * 60 = 60
      expect(result.current.remainingSec).toBe(60)
    })

    it('transitions from work to break after work phase ends', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('pomodoro', {
          pomodoroConfig: { workMin: 1, breakMin: 1, cycles: 2 },
        })
      })

      // Advance through the full work phase (60s)
      act(() => { vi.advanceTimersByTime(60000) })

      // Should now be in break phase
      expect(result.current.mode).toBe('pomodoro')
      // remainingSec resets to breakMin * 60
      expect(result.current.remainingSec).toBe(60)
    })
  })

  describe('pause and resume', () => {
    it('pauses the timer (status = paused, elapsed stops)', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('stopwatch')
      })

      act(() => { vi.advanceTimersByTime(5000) })
      expect(result.current.elapsedSec).toBe(5)

      act(() => { result.current.pause() })
      expect(result.current.status).toBe('paused')
      expect(result.current.isPaused).toBe(true)

      // Advancing time while paused should NOT change elapsedSec
      act(() => { vi.advanceTimersByTime(10000) })
      expect(result.current.elapsedSec).toBe(5)
    })

    it('resumes from paused state and continues counting', async () => {
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('stopwatch')
      })

      act(() => { vi.advanceTimersByTime(5000) })
      act(() => { result.current.pause() })
      act(() => { vi.advanceTimersByTime(10000) })

      // Resume — elapsed should continue from 5
      act(() => { result.current.resume() })
      expect(result.current.status).toBe('running')
      expect(result.current.isPaused).toBe(false)

      act(() => { vi.advanceTimersByTime(3000) })
      expect(result.current.elapsedSec).toBe(8)
    })
  })

  describe('rehydration from localStorage', () => {
    it('restores running state when valid active session entry exists on mount', async () => {
      const { getSession } = await import('../api/sessions')
      const { ACTIVE_SESSION_KEY } = await import('../store')
      const { useTimer } = await import('./useTimer')

      const startedAt = Date.now() - 5000 // 5 seconds ago
      const activeData = {
        sessionId: 'rehydrated-session',
        mode: 'stopwatch',
        startedAt,
        totalPausedMs: 0,
        pomodoroConfig: null,
        targetSec: null,
        currentCycle: 1,
        pomodoroPhase: 'work',
      }
      localStorageMock.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeData))

      // getSession returns a mock with endedAt null (still active)
      vi.mocked(getSession).mockResolvedValue({
        id: 'rehydrated-session',
        endedAt: null,
        startedAt: new Date(startedAt).toISOString(),
      } as never)

      const { result } = renderHook(() => useTimer())

      // Allow async rehydration effect to settle (flush microtasks + 1 tick)
      await act(async () => {
        await Promise.resolve() // flush microtasks
        await Promise.resolve() // second flush for chained async
      })

      expect(result.current.status).toBe('running')
      expect(result.current.sessionId).toBe('rehydrated-session')
      expect(result.current.elapsedSec).toBeGreaterThanOrEqual(5)
    })

    it('clears stale localStorage entry when session already ended on server', async () => {
      const { getSession } = await import('../api/sessions')
      const { ACTIVE_SESSION_KEY } = await import('../store')
      const { useTimer } = await import('./useTimer')

      const activeData = {
        sessionId: 'stale-session',
        mode: 'stopwatch',
        startedAt: Date.now() - 60000,
        totalPausedMs: 0,
        pomodoroConfig: null,
        targetSec: null,
        currentCycle: 1,
        pomodoroPhase: 'work',
      }
      localStorageMock.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeData))

      // getSession returns a record with endedAt set — session is stale
      vi.mocked(getSession).mockResolvedValue({
        id: 'stale-session',
        endedAt: new Date().toISOString(),
        startedAt: new Date(activeData.startedAt).toISOString(),
      } as never)

      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(result.current.status).toBe('idle')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(ACTIVE_SESSION_KEY)
    })

    it('stays idle when no localStorage entry exists on mount', async () => {
      const { useTimer } = await import('./useTimer')

      // No entry in localStorage (clear was called in beforeEach)
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.sessionId).toBeNull()
    })
  })

  describe('stop', () => {
    it('calls endSession with computed durationSec and resets to idle', async () => {
      const { endSession } = await import('../api/sessions')
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('stopwatch')
      })

      act(() => { vi.advanceTimersByTime(10000) })

      await act(async () => {
        await result.current.stop()
      })

      expect(endSession).toHaveBeenCalledWith(
        'session-test-id',
        expect.any(Number)
      )
      expect(result.current.status).toBe('idle')
      expect(result.current.elapsedSec).toBe(0)
    })

    it('computes durationSec excluding pause time', async () => {
      const { endSession } = await import('../api/sessions')
      const { useTimer } = await import('./useTimer')
      const { result } = renderHook(() => useTimer())

      await act(async () => {
        await result.current.start('stopwatch')
      })

      act(() => { vi.advanceTimersByTime(10000) })   // 10s running
      act(() => { result.current.pause() })
      act(() => { vi.advanceTimersByTime(5000) })    // 5s paused (should not count)
      act(() => { result.current.resume() })
      act(() => { vi.advanceTimersByTime(5000) })    // 5s more running

      await act(async () => {
        await result.current.stop()
      })

      const [, durationSec] = vi.mocked(endSession).mock.calls[0]
      // effective duration = 10 + 5 = 15 (excluding 5s pause)
      expect(durationSec).toBe(15)
    })
  })
})
