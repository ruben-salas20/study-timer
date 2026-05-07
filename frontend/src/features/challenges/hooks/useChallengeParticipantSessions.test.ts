// useChallengeParticipantSessions.test.ts — TDD tests for group streak session aggregation
// Tests: returns a Record<userId, string[]> of UTC date strings for each participant.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

vi.mock('@/shared/pb', () => ({
  default: {
    authStore: {
      model: { id: 'user-me' },
      isValid: true,
      onChange: vi.fn(() => () => {}),
    },
    collection: vi.fn().mockReturnValue({
      getList: vi.fn().mockResolvedValue({ items: [] }),
    }),
  },
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useChallengeParticipantSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty map when no participants are provided', async () => {
    const { useChallengeParticipantSessions } = await import('./useChallengeParticipantSessions')

    const { result } = renderHook(
      () => useChallengeParticipantSessions([]),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sessionsByUser).toEqual({})
  })

  it('returns session dates keyed by userId when participants have sessions', async () => {
    const pb = (await import('@/shared/pb')).default
    // Simulate two users with sessions on different days
    const mockGetList = vi.fn()
      .mockResolvedValueOnce({
        items: [
          { user: 'u1', startedAt: '2024-01-01T10:00:00Z' },
          { user: 'u1', startedAt: '2024-01-02T10:00:00Z' },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          { user: 'u2', startedAt: '2024-01-01T12:00:00Z' },
          { user: 'u2', startedAt: '2024-01-03T12:00:00Z' },
        ],
      })

    vi.mocked(pb.collection).mockReturnValue({
      getList: mockGetList,
    } as never)

    const { useChallengeParticipantSessions } = await import('./useChallengeParticipantSessions')

    const { result } = renderHook(
      () => useChallengeParticipantSessions(['u1', 'u2']),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.sessionsByUser['u1']).toContain('2024-01-01')
    expect(result.current.sessionsByUser['u1']).toContain('2024-01-02')
    expect(result.current.sessionsByUser['u2']).toContain('2024-01-01')
    expect(result.current.sessionsByUser['u2']).toContain('2024-01-03')
  })

  it('deduplicates multiple sessions on the same day for one user', async () => {
    const pb = (await import('@/shared/pb')).default
    const mockGetList = vi.fn().mockResolvedValueOnce({
      items: [
        { user: 'u1', startedAt: '2024-01-01T08:00:00Z' },
        { user: 'u1', startedAt: '2024-01-01T20:00:00Z' }, // same day
      ],
    })

    vi.mocked(pb.collection).mockReturnValue({
      getList: mockGetList,
    } as never)

    const { useChallengeParticipantSessions } = await import('./useChallengeParticipantSessions')

    const { result } = renderHook(
      () => useChallengeParticipantSessions(['u1']),
      { wrapper: makeWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Only one entry for that day (deduplication)
    expect(result.current.sessionsByUser['u1']).toHaveLength(1)
    expect(result.current.sessionsByUser['u1'][0]).toBe('2024-01-01')
  })
})
