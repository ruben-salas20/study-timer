// sessions.test.ts — RED tests for sessions API
// Tests written BEFORE sessions.ts is implemented (TDD cycle).
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/pb', () => {
  const mockCreate = vi.fn()
  const mockUpdate = vi.fn()
  const mockGetList = vi.fn()

  const mockCollection = vi.fn().mockReturnValue({
    create: mockCreate,
    update: mockUpdate,
    getList: mockGetList,
  })

  return {
    default: {
      collection: mockCollection,
      authStore: {
        model: { id: 'user-123' },
        isValid: true,
        onChange: vi.fn(() => () => {}),
      },
    },
  }
})

describe('sessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSession()', () => {
    it('creates a study_sessions record with stopwatch mode', async () => {
      const pb = (await import('@/shared/pb')).default
      const mockRecord = { id: 'session-abc', mode: 'stopwatch', user: 'user-123' }
      vi.mocked(pb.collection).mockReturnValue({
        create: vi.fn().mockResolvedValue(mockRecord),
        update: vi.fn(),
        getList: vi.fn(),
      } as ReturnType<typeof pb.collection>)

      const { createSession } = await import('./sessions')
      const result = await createSession('stopwatch')

      expect(pb.collection).toHaveBeenCalledWith('study_sessions')
      expect(result).toBe('session-abc')
    })

    it('creates a study_sessions record with pomodoro mode and config', async () => {
      const pb = (await import('@/shared/pb')).default
      const mockRecord = { id: 'session-def', mode: 'pomodoro', user: 'user-123' }
      vi.mocked(pb.collection).mockReturnValue({
        create: vi.fn().mockResolvedValue(mockRecord),
        update: vi.fn(),
        getList: vi.fn(),
      } as ReturnType<typeof pb.collection>)

      const { createSession } = await import('./sessions')
      const config = { workMin: 25, breakMin: 5, cycles: 4 }
      const result = await createSession('pomodoro', config)

      expect(result).toBe('session-def')
      const createFn = vi.mocked(pb.collection).mock.results[0].value.create
      expect(createFn).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'pomodoro',
          pomodoroConfig: config,
        })
      )
    })
  })

  describe('endSession()', () => {
    it('patches the session record with endedAt and durationSec', async () => {
      const pb = (await import('@/shared/pb')).default
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'session-abc' })
      vi.mocked(pb.collection).mockReturnValue({
        create: vi.fn(),
        update: mockUpdate,
        getList: vi.fn(),
      } as ReturnType<typeof pb.collection>)

      const { endSession } = await import('./sessions')
      await endSession('session-abc', 1500)

      expect(pb.collection).toHaveBeenCalledWith('study_sessions')
      expect(mockUpdate).toHaveBeenCalledWith(
        'session-abc',
        expect.objectContaining({
          durationSec: 1500,
          endedAt: expect.any(String),
        })
      )
    })

    it('endedAt is an ISO date string', async () => {
      const pb = (await import('@/shared/pb')).default
      const mockUpdate = vi.fn().mockResolvedValue({ id: 's1' })
      vi.mocked(pb.collection).mockReturnValue({
        create: vi.fn(),
        update: mockUpdate,
        getList: vi.fn(),
      } as ReturnType<typeof pb.collection>)

      const { endSession } = await import('./sessions')
      await endSession('s1', 300)

      const callArgs = mockUpdate.mock.calls[0][1] as Record<string, unknown>
      const dateStr = callArgs.endedAt as string
      expect(new Date(dateStr).toISOString()).toBe(dateStr)
    })
  })
})
