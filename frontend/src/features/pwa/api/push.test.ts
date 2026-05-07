// push.test.ts — happy-path tests for savePushSubscription / removePushSubscription
//
// Strategy: mock pb to avoid real network calls. Tests verify:
//   1. savePushSubscription sends the correct shape to pb.collection().create()
//   2. removePushSubscription queries by endpoint and calls delete()
//   3. removePushSubscription silently handles "not found" (no throw)

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreate = vi.fn()
const mockGetFirstListItem = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/shared/pb', () => ({
  default: {
    authStore: {
      model: { id: 'user-abc' },
    },
    collection: () => ({
      create: mockCreate,
      getFirstListItem: mockGetFirstListItem,
      delete: mockDelete,
    }),
  },
}))

// ── Import after mocks ────────────────────────────────────────────────────────

import { savePushSubscription, removePushSubscription } from './push'

// ── Fake PushSubscription ─────────────────────────────────────────────────────

function buildFakeSub(endpoint = 'https://push.example.com/abc') {
  const p256dhBytes = new Uint8Array([0x04, 0xAB, 0xCD])
  const authBytes = new Uint8Array([0xFF, 0x01])
  return {
    endpoint,
    expirationTime: null,
    getKey(name: string) {
      if (name === 'p256dh') return p256dhBytes.buffer
      if (name === 'auth') return authBytes.buffer
      return null
    },
    toJSON: () => ({}),
    unsubscribe: async () => true,
  } as unknown as PushSubscription
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('savePushSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ id: 'rec-1' })
    // stub navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'TestBrowser/1.0',
      configurable: true,
    })
  })

  it('calls pb.collection(push_subscriptions).create with user, endpoint, p256dh, auth', async () => {
    const sub = buildFakeSub('https://push.example.com/token123')

    await savePushSubscription(sub)

    expect(mockCreate).toHaveBeenCalledOnce()
    const payload = mockCreate.mock.calls[0][0] as Record<string, unknown>
    expect(payload.user).toBe('user-abc')
    expect(payload.endpoint).toBe('https://push.example.com/token123')
    expect(typeof payload.p256dh).toBe('string')
    expect(typeof payload.auth).toBe('string')
    // base64-url — no padding, no standard base64 chars
    expect(payload.p256dh as string).not.toContain('=')
    expect(payload.auth as string).not.toContain('=')
  })

  it('includes a truncated userAgent in the payload', async () => {
    const sub = buildFakeSub()

    await savePushSubscription(sub)

    const payload = mockCreate.mock.calls[0][0] as Record<string, unknown>
    expect(typeof payload.userAgent).toBe('string')
    // Must not exceed 500 chars
    expect((payload.userAgent as string).length).toBeLessThanOrEqual(500)
  })
})

describe('removePushSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries by endpoint and calls delete with the record id', async () => {
    mockGetFirstListItem.mockResolvedValue({ id: 'rec-42' })
    mockDelete.mockResolvedValue(undefined)

    await removePushSubscription('https://push.example.com/delete-me')

    expect(mockGetFirstListItem).toHaveBeenCalledOnce()
    const filter = mockGetFirstListItem.mock.calls[0][0] as string
    expect(filter).toContain('push.example.com/delete-me')

    expect(mockDelete).toHaveBeenCalledWith('rec-42')
  })

  it('silently succeeds when no subscription is found (getFirstListItem throws)', async () => {
    mockGetFirstListItem.mockRejectedValue(new Error('Not found'))

    await expect(
      removePushSubscription('https://push.example.com/not-there')
    ).resolves.toBeUndefined()

    expect(mockDelete).not.toHaveBeenCalled()
  })
})
