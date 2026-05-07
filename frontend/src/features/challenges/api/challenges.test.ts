// challenges.test.ts — RED → GREEN tests for challenges API
// Tests cover: createChallenge, joinChallenge, leaveChallenge,
//              cancelChallenge, listMyChallenges, getChallenge.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── PocketBase mock ──────────────────────────────────────────────────────────
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockGetList = vi.fn()
const mockGetOne = vi.fn()

vi.mock('@/shared/pb', () => {
  const mockCollection = vi.fn().mockReturnValue({
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    getList: mockGetList,
    getOne: mockGetOne,
  })

  return {
    default: {
      collection: mockCollection,
      authStore: {
        model: { id: 'current-user-id' },
        isValid: true,
        onChange: vi.fn(() => () => {}),
      },
    },
  }
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('challenges API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── createChallenge ──────────────────────────────────────────────────────

  describe('createChallenge()', () => {
    it('creates challenge record and adds each invited participant', async () => {
      const challengeData = {
        type: 'race' as const,
        title: 'Test Race',
        startsAt: new Date('2024-02-01'),
        endsAt: new Date('2024-03-01'),
        targetSec: 7200,
        prizeWinner: 'Winner gets coffee',
        status: 'pending' as const,
      }
      const createdChallenge = { id: 'challenge-id', ...challengeData }

      mockCreate
        .mockResolvedValueOnce(createdChallenge)   // challenge create
        .mockResolvedValueOnce({ id: 'p1' })        // participant 1

      const { createChallenge } = await import('./challenges')
      const result = await createChallenge(challengeData, ['friend-user-id'])

      // Should have called create twice: once for challenge, once for participant
      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(result.id).toBe('challenge-id')
    })

    it('creates challenge without invited participants (solo challenge)', async () => {
      const challengeData = {
        type: 'race' as const,
        title: 'Solo Race',
        startsAt: new Date('2024-02-01'),
        endsAt: new Date('2024-03-01'),
        targetSec: 7200,
        prizeWinner: 'Self reward',
        status: 'pending' as const,
      }
      mockCreate.mockResolvedValueOnce({ id: 'ch-solo', ...challengeData })

      const { createChallenge } = await import('./challenges')
      const result = await createChallenge(challengeData, [])

      // Only 1 create call for the challenge itself
      expect(mockCreate).toHaveBeenCalledTimes(1)
      expect(result.id).toBe('ch-solo')
    })

    it('continues if one participant create fails (best-effort)', async () => {
      const challengeData = {
        type: 'race' as const,
        title: 'Race with error',
        startsAt: new Date('2024-02-01'),
        endsAt: new Date('2024-03-01'),
        targetSec: 7200,
        prizeWinner: 'Prize',
        status: 'pending' as const,
      }
      mockCreate
        .mockResolvedValueOnce({ id: 'ch-2', ...challengeData }) // challenge ok
        .mockRejectedValueOnce(new Error('Participant create failed'))  // participant fails

      const { createChallenge } = await import('./challenges')
      // Should NOT throw — best-effort for F4
      const result = await createChallenge(challengeData, ['bad-user-id'])

      expect(result.id).toBe('ch-2')
    })
  })

  // ── joinChallenge ────────────────────────────────────────────────────────

  describe('joinChallenge()', () => {
    it('creates a challenge_participants record for current user', async () => {
      mockCreate.mockResolvedValueOnce({ id: 'part-1', user: 'current-user-id' })

      const { joinChallenge } = await import('./challenges')
      await joinChallenge('challenge-id')

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          challenge: 'challenge-id',
          user: 'current-user-id',
        })
      )
    })
  })

  // ── leaveChallenge ───────────────────────────────────────────────────────

  describe('leaveChallenge()', () => {
    it('deletes the participant row', async () => {
      mockDelete.mockResolvedValueOnce(undefined)

      const { leaveChallenge } = await import('./challenges')
      await leaveChallenge('participant-id')

      expect(mockDelete).toHaveBeenCalledWith('participant-id')
    })
  })

  // ── cancelChallenge ──────────────────────────────────────────────────────

  describe('cancelChallenge()', () => {
    it('patches status to cancelled', async () => {
      mockUpdate.mockResolvedValueOnce({ id: 'ch-1', status: 'cancelled' })

      const { cancelChallenge } = await import('./challenges')
      await cancelChallenge('ch-1')

      expect(mockUpdate).toHaveBeenCalledWith('ch-1', { status: 'cancelled' })
    })
  })

  // ── listMyChallenges ─────────────────────────────────────────────────────

  describe('listMyChallenges()', () => {
    it('returns challenges with expanded participants', async () => {
      const mockResponse = {
        items: [
          {
            id: 'ch-1',
            type: 'race',
            title: 'My Race',
            status: 'active',
            expand: {
              'challenge_participants(challenge)': [
                { id: 'p1', user: 'current-user-id', progressSec: 1800 },
              ],
            },
          },
        ],
        totalItems: 1,
      }
      mockGetList.mockResolvedValueOnce(mockResponse)

      const { listMyChallenges } = await import('./challenges')
      const result = await listMyChallenges()

      expect(mockGetList).toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('ch-1')
    })
  })

  // ── getChallenge ─────────────────────────────────────────────────────────

  describe('getChallenge()', () => {
    it('returns a single challenge with participants expanded', async () => {
      const mockChallenge = {
        id: 'ch-1',
        type: 'duel',
        title: 'Epic Duel',
        status: 'active',
        expand: {
          'challenge_participants(challenge)': [
            { id: 'p1', user: 'u1', progressSec: 3600 },
            { id: 'p2', user: 'u2', progressSec: 1200 },
          ],
        },
      }
      mockGetOne.mockResolvedValueOnce(mockChallenge)

      const { getChallenge } = await import('./challenges')
      const result = await getChallenge('ch-1')

      expect(mockGetOne).toHaveBeenCalledWith('ch-1', expect.objectContaining({ expand: expect.any(String) }))
      expect(result.id).toBe('ch-1')
      expect(result.participants).toHaveLength(2)
    })
  })
})
