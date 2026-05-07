// serializeSubscription.test.ts — TDD: RED → GREEN → TRIANGULATE
//
// Tests for the PushSubscription → PocketBase shape serializer.
// PocketBase's push_subscriptions collection expects:
//   { endpoint: string, p256dh: string, auth: string }
// where p256dh and auth are base64-url encoded strings.
//
// The PushSubscription.getKey() method returns ArrayBuffer values that we
// must convert to base64-url strings for storage.

import { describe, it, expect } from 'vitest'
import { serializeSubscription } from './serializeSubscription'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Encode bytes to base64-url (no padding) — mirrors what serializeSubscription must do */
function toBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/** Build a minimal fake PushSubscription for testing */
function buildFakeSubscription(overrides?: {
  endpoint?: string
  p256dhBytes?: number[]
  authBytes?: number[]
}): PushSubscription {
  const endpoint = overrides?.endpoint ?? 'https://push.example.com/endpoint/abc123'
  const p256dhBytes = overrides?.p256dhBytes ?? [1, 2, 3, 4, 5]
  const authBytes = overrides?.authBytes ?? [9, 8, 7]

  const p256dhBuffer = new Uint8Array(p256dhBytes).buffer
  const authBuffer = new Uint8Array(authBytes).buffer

  return {
    endpoint,
    expirationTime: null,
    options: {} as PushSubscriptionOptions,
    getKey(name: string): ArrayBuffer | null {
      if (name === 'p256dh') return p256dhBuffer
      if (name === 'auth') return authBuffer
      return null
    },
    toJSON: () => ({ endpoint, expirationTime: null, keys: {} }),
    unsubscribe: async () => true,
  } as unknown as PushSubscription
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('serializeSubscription', () => {
  it('returns the endpoint unchanged from the PushSubscription', () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/unique-device-token'
    const sub = buildFakeSubscription({ endpoint })

    const result = serializeSubscription(sub)

    expect(result.endpoint).toBe(endpoint)
  })

  it('serializes p256dh ArrayBuffer to base64-url string', () => {
    const p256dhBytes = [0x04, 0xAB, 0xCD, 0xEF, 0x12]
    const sub = buildFakeSubscription({ p256dhBytes })

    const result = serializeSubscription(sub)

    const expectedP256dh = toBase64Url(new Uint8Array(p256dhBytes).buffer)
    expect(result.p256dh).toBe(expectedP256dh)
    // Must not contain standard base64 padding
    expect(result.p256dh).not.toContain('=')
  })

  it('serializes auth ArrayBuffer to base64-url string', () => {
    const authBytes = [0xFF, 0x00, 0x55, 0xAA]
    const sub = buildFakeSubscription({ authBytes })

    const result = serializeSubscription(sub)

    const expectedAuth = toBase64Url(new Uint8Array(authBytes).buffer)
    expect(result.auth).toBe(expectedAuth)
    expect(result.auth).not.toContain('=')
  })

  it('returns exactly { endpoint, p256dh, auth } — no extra properties', () => {
    const sub = buildFakeSubscription()

    const result = serializeSubscription(sub)

    expect(Object.keys(result).sort()).toEqual(['auth', 'endpoint', 'p256dh'])
  })

  it('handles bytes that would produce + and / in standard base64 (must be - and _)', () => {
    // 0xFB → standard base64 char '+'; 0xFF → '/'
    const p256dhBytes = [0xfb, 0xff, 0xfe]
    const sub = buildFakeSubscription({ p256dhBytes })

    const result = serializeSubscription(sub)

    expect(result.p256dh).not.toContain('+')
    expect(result.p256dh).not.toContain('/')
  })
})
