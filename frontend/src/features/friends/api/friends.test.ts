// friends.test.ts — RED tests for friends API
// All tests written BEFORE friends.ts is implemented (TDD cycle).
// Tests cover: sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
// removeFriend, listFriends, listIncomingRequests, listOutgoingRequests.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── PocketBase mock ──────────────────────────────────────────────────────────
const mockGetFirstListItem = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockGetList = vi.fn()

vi.mock('@/shared/pb', () => {
  const mockCollection = vi.fn().mockReturnValue({
    getFirstListItem: mockGetFirstListItem,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    getList: mockGetList,
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

describe('friends API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── sendFriendRequest ────────────────────────────────────────────────────

  describe('sendFriendRequest()', () => {
    it('happy path — finds user by friendCode and creates pending friendship', async () => {
      const targetUser = { id: 'target-user-id', friendCode: 'ABC123' }
      mockGetFirstListItem.mockResolvedValueOnce(targetUser)
      mockCreate.mockResolvedValueOnce({
        id: 'friendship-id',
        status: 'pending',
        userA: 'current-user-id',
        userB: 'target-user-id',
        requestedBy: 'current-user-id',
      })

      const { sendFriendRequest } = await import('./friends')
      const result = await sendFriendRequest('ABC123')

      expect(mockGetFirstListItem).toHaveBeenCalledWith('friendCode = "ABC123"')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userA: 'current-user-id',
          userB: 'target-user-id',
          status: 'pending',
          requestedBy: 'current-user-id',
        })
      )
      expect(result.id).toBe('friendship-id')
    })

    it('throws when friendCode is not found', async () => {
      mockGetFirstListItem.mockRejectedValueOnce(new Error('Not found'))

      const { sendFriendRequest } = await import('./friends')
      await expect(sendFriendRequest('XXXXXX')).rejects.toThrow('Friend not found')
    })

    it('throws when trying to add yourself', async () => {
      // Returns the current user's own record
      mockGetFirstListItem.mockResolvedValueOnce({ id: 'current-user-id', friendCode: 'MYCODE' })

      const { sendFriendRequest } = await import('./friends')
      await expect(sendFriendRequest('MYCODE')).rejects.toThrow('Cannot add yourself')
    })

    it('throws on duplicate friendship (create rejected by hook)', async () => {
      mockGetFirstListItem.mockResolvedValueOnce({ id: 'other-user-id', friendCode: 'OTHER1' })
      mockCreate.mockRejectedValueOnce(new Error('A friendship between these users already exists'))

      const { sendFriendRequest } = await import('./friends')
      await expect(sendFriendRequest('OTHER1')).rejects.toThrow('already exists')
    })
  })

  // ── acceptFriendRequest ──────────────────────────────────────────────────

  describe('acceptFriendRequest()', () => {
    it('patches status to accepted', async () => {
      mockUpdate.mockResolvedValueOnce({ id: 'friendship-id', status: 'accepted' })

      const { acceptFriendRequest } = await import('./friends')
      await acceptFriendRequest('friendship-id')

      expect(mockUpdate).toHaveBeenCalledWith('friendship-id', { status: 'accepted' })
    })
  })

  // ── rejectFriendRequest ──────────────────────────────────────────────────

  describe('rejectFriendRequest()', () => {
    it('deletes the friendship record', async () => {
      mockDelete.mockResolvedValueOnce(undefined)

      const { rejectFriendRequest } = await import('./friends')
      await rejectFriendRequest('friendship-id')

      expect(mockDelete).toHaveBeenCalledWith('friendship-id')
    })
  })

  // ── removeFriend ─────────────────────────────────────────────────────────

  describe('removeFriend()', () => {
    it('deletes the accepted friendship record', async () => {
      mockDelete.mockResolvedValueOnce(undefined)

      const { removeFriend } = await import('./friends')
      await removeFriend('friendship-id')

      expect(mockDelete).toHaveBeenCalledWith('friendship-id')
    })
  })

  // ── listFriends ──────────────────────────────────────────────────────────

  describe('listFriends()', () => {
    it('returns accepted friendships with expand, filtering by current user', async () => {
      const mockFriendships = {
        items: [
          {
            id: 'fs-1',
            status: 'accepted',
            userA: 'current-user-id',
            userB: 'friend-id-1',
            requestedBy: 'current-user-id',
            expand: {
              userA: { id: 'current-user-id', displayName: 'Me', friendCode: 'MECODE' },
              userB: { id: 'friend-id-1', displayName: 'Alice', friendCode: 'ALICE1' },
            },
          },
        ],
        totalItems: 1,
      }
      mockGetList.mockResolvedValueOnce(mockFriendships)

      const { listFriends } = await import('./friends')
      const result = await listFriends()

      expect(mockGetList).toHaveBeenCalledWith(
        1,
        200,
        expect.objectContaining({
          filter: expect.stringContaining('status = "accepted"'),
          expand: expect.stringContaining('userA'),
        })
      )
      // Should return the other user's info (not the current user)
      expect(result).toHaveLength(1)
      expect(result[0].friendshipId).toBe('fs-1')
      expect(result[0].user.displayName).toBe('Alice')
    })

    it('returns empty array when no accepted friends', async () => {
      mockGetList.mockResolvedValueOnce({ items: [], totalItems: 0 })

      const { listFriends } = await import('./friends')
      const result = await listFriends()

      expect(result).toHaveLength(0)
    })
  })

  // ── listIncomingRequests ─────────────────────────────────────────────────

  describe('listIncomingRequests()', () => {
    it('returns pending requests where current user is NOT requestedBy', async () => {
      const mockRequests = {
        items: [
          {
            id: 'req-1',
            status: 'pending',
            userA: 'other-id',
            userB: 'current-user-id',
            requestedBy: 'other-id',
            expand: {
              userA: { id: 'other-id', displayName: 'Bob', friendCode: 'BOB001' },
              userB: { id: 'current-user-id', displayName: 'Me', friendCode: 'MECODE' },
            },
          },
        ],
        totalItems: 1,
      }
      mockGetList.mockResolvedValueOnce(mockRequests)

      const { listIncomingRequests } = await import('./friends')
      const result = await listIncomingRequests()

      expect(mockGetList).toHaveBeenCalledWith(
        1,
        200,
        expect.objectContaining({
          filter: expect.stringContaining('requestedBy != "current-user-id"'),
        })
      )
      expect(result).toHaveLength(1)
      expect(result[0].friendshipId).toBe('req-1')
    })
  })

  // ── listOutgoingRequests ─────────────────────────────────────────────────

  describe('listOutgoingRequests()', () => {
    it('returns pending requests where current user IS requestedBy', async () => {
      const mockRequests = {
        items: [
          {
            id: 'req-2',
            status: 'pending',
            userA: 'current-user-id',
            userB: 'other-id',
            requestedBy: 'current-user-id',
            expand: {
              userA: { id: 'current-user-id', displayName: 'Me', friendCode: 'MECODE' },
              userB: { id: 'other-id', displayName: 'Carol', friendCode: 'CAROL1' },
            },
          },
        ],
        totalItems: 1,
      }
      mockGetList.mockResolvedValueOnce(mockRequests)

      const { listOutgoingRequests } = await import('./friends')
      const result = await listOutgoingRequests()

      expect(mockGetList).toHaveBeenCalledWith(
        1,
        200,
        expect.objectContaining({
          filter: expect.stringContaining('requestedBy = "current-user-id"'),
        })
      )
      expect(result).toHaveLength(1)
      expect(result[0].friendshipId).toBe('req-2')
    })
  })
})
