// urlBase64ToUint8Array.test.ts — TDD: RED → GREEN → TRIANGULATE
//
// Tests for the VAPID public key conversion utility.
// The browser's PushManager.subscribe() requires the applicationServerKey as
// a Uint8Array. VAPID keys are distributed as base64-url strings.
//
// Test vectors sourced from the Web Push Protocol spec (RFC 8292) and the
// web-push library's own test suite for cross-validation.

import { describe, it, expect } from 'vitest'
import { urlBase64ToUint8Array } from './urlBase64ToUint8Array'

describe('urlBase64ToUint8Array', () => {
  it('converts a well-known base64-url VAPID public key to Uint8Array', () => {
    // This is a known 65-byte uncompressed EC public key in base64-url encoding
    // (no padding). The expected first byte is 0x04 (uncompressed point marker).
    const base64url =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkgnVexbkhVJiA208banmvnRONsIyQMTaSmRfWVHRc'

    const result = urlBase64ToUint8Array(base64url)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBe(65)
    // Uncompressed EC public key must start with 0x04
    expect(result[0]).toBe(4)
  })

  it('handles base64-url strings that need padding added (length % 4 !== 0)', () => {
    // Standard base64 requires padding to a multiple of 4 with '='.
    // Base64-url often omits trailing '=' — our converter must re-add them.
    // This string is 86 chars (86 % 4 == 2 → needs 2 '=' padding chars).
    const base64url =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkgnVexbkhVJiA208banmvnRONsIyQMTaSmRfWVHRc'

    const result = urlBase64ToUint8Array(base64url)

    // Must not throw and must produce valid bytes (not all zeros)
    expect(result.some((b) => b !== 0)).toBe(true)
  })

  it('replaces base64-url chars (- and _) with standard base64 chars (+ and /)', () => {
    // This fixture contains both '-' and '_' characters (base64-url encoding).
    // If not replaced, atob() will throw or produce incorrect bytes.
    // We verify by round-tripping: encode known bytes → base64-url → decode → check.
    const bytes = new Uint8Array([0xfb, 0xff, 0x00, 0x01]) // 0xfb encodes to '+'
    const standard = btoa(String.fromCharCode(...bytes))    // standard base64
    // Convert + to -, / to _ to make it base64-url, strip padding
    const base64url = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

    const result = urlBase64ToUint8Array(base64url)

    expect(result).toEqual(bytes)
  })
})
