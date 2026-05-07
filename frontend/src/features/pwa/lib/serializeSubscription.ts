// serializeSubscription.ts — PushSubscription → PocketBase shape serializer
//
// PocketBase's push_subscriptions collection stores:
//   { endpoint: string, p256dh: string, auth: string }
// where p256dh and auth must be base64-url encoded strings (no padding).
//
// The browser's PushSubscription.getKey() returns ArrayBuffer values.
// This module converts those buffers to the base64-url format PocketBase expects.
//
// Why base64-url (not standard base64)?
//   RFC 8291 (Message Encryption for Web Push) uses base64-url encoding for keys.
//   Keeping the same encoding throughout prevents double-conversion bugs.
//
// Reference: RFC 8291 §3.1, MDN PushSubscription.getKey()

/** Shape expected by the push_subscriptions PocketBase collection */
export interface SerializedSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Convert an ArrayBuffer to a base64-url string (no padding).
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Serialize a browser PushSubscription into the flat shape expected by PocketBase.
 *
 * @param subscription - A live PushSubscription from PushManager.subscribe()
 * @returns SerializedSubscription ready to POST to push_subscriptions collection
 */
export function serializeSubscription(
  subscription: PushSubscription
): SerializedSubscription {
  const p256dhBuffer = subscription.getKey('p256dh')
  const authBuffer = subscription.getKey('auth')

  if (!p256dhBuffer || !authBuffer) {
    throw new Error(
      'PushSubscription.getKey() returned null — subscription may be invalid'
    )
  }

  return {
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64Url(p256dhBuffer),
    auth: arrayBufferToBase64Url(authBuffer),
  }
}
