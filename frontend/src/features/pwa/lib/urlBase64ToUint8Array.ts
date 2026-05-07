// urlBase64ToUint8Array.ts — VAPID public key conversion utility
//
// Converts a base64-url encoded string (as returned by VAPID key generators)
// to a Uint8Array, which is the format required by PushManager.subscribe()
// for the `applicationServerKey` parameter.
//
// Base64-url encoding differs from standard base64 in two ways:
//   1. Uses '-' instead of '+' and '_' instead of '/'
//   2. Omits trailing '=' padding characters
//
// This conversion is required because:
//   - VAPID public keys are distributed as base64-url strings (no padding)
//   - The Web Push API (PushManager) requires a Uint8Array
//   - The browser's atob() only understands standard base64 (with '+' and '/')
//
// Reference: RFC 4648 §5 (base64url), RFC 8292 §2 (VAPID), MDN PushManager

/**
 * Convert a base64-url string to a Uint8Array.
 *
 * @param base64UrlString - A base64-url encoded string (may omit '=' padding)
 * @returns Uint8Array of decoded bytes
 */
export function urlBase64ToUint8Array(base64UrlString: string): Uint8Array {
  // Step 1: Replace base64-url characters with standard base64 characters
  const base64 = base64UrlString
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  // Step 2: Re-add padding to make length a multiple of 4
  // base64 strings must have a length divisible by 4; base64-url strips padding
  const paddingLength = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(paddingLength)

  // Step 3: Decode standard base64 to binary string, then to Uint8Array
  const binaryString = atob(padded)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return bytes
}
