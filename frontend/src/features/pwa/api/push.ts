// features/pwa/api/push.ts — Push subscription CRUD against PocketBase
//
// Exposes:
//   savePushSubscription(sub)       — upsert into push_subscriptions
//   removePushSubscription(endpoint) — find by endpoint + delete
//   reconcilePushSubscription()     — boot-time self-heal so the browser and
//                                     backend agree on subscription state
//
// All require the user to be authenticated (PocketBase rules enforce it).

import pb from '@/shared/pb'
import { serializeSubscription } from '../lib/serializeSubscription'
import { urlBase64ToUint8Array } from '../lib/urlBase64ToUint8Array'

/** PocketBase collection name for push subscriptions */
const COLLECTION = 'push_subscriptions'

const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

/**
 * Save a push subscription to PocketBase, idempotently.
 *
 * The previous version always called `create`, which produced duplicates if
 * the user opened a second tab or if the boot-time reconciler ran on an
 * endpoint that was already saved. We now look up by (user, endpoint) first
 * and bail out if it already exists.
 */
export async function savePushSubscription(sub: PushSubscription) {
  const userId = pb.authStore.model?.id as string | undefined
  if (!userId) throw new Error('User not authenticated')

  const serialized = serializeSubscription(sub)
  const escapedEndpoint = serialized.endpoint.replace(/"/g, '\\"')

  try {
    const existing = await pb.collection(COLLECTION).getFirstListItem(
      `endpoint = "${escapedEndpoint}" && user = "${userId}"`,
      { requestKey: `push-sub-existing-${userId}` }
    )
    return existing
  } catch {
    // 404 = not found — fall through to create.
  }

  return pb.collection(COLLECTION).create({
    user: userId,
    endpoint: serialized.endpoint,
    p256dh: serialized.p256dh,
    auth: serialized.auth,
    userAgent: navigator.userAgent.slice(0, 500),
  })
}

/**
 * Remove a push subscription from PocketBase by its endpoint URL.
 * Silently succeeds if no subscription with that endpoint is found.
 *
 * @param endpoint - The push subscription endpoint URL
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const userId = pb.authStore.model?.id as string | undefined
  if (!userId) return

  try {
    const record = await pb.collection(COLLECTION).getFirstListItem(
      `endpoint = "${endpoint.replace(/"/g, '\\"')}" && user = "${userId}"`
    )
    await pb.collection(COLLECTION).delete(record.id)
  } catch {
    // Not found — nothing to remove
  }
}

/**
 * reconcilePushSubscription — bring the backend state in sync with the
 * browser. Call on every authenticated boot.
 *
 * Cases handled:
 *   - permission != 'granted'                   → no-op (user hasn't opted in)
 *   - permission = 'granted' + browser sub      → upsert into PB
 *   - permission = 'granted' + no browser sub   → re-subscribe + upsert
 *
 * This closes the silent-failure window that left users believing they had
 * notifications "activated" while the backend had no record of them — every
 * subsequent dispatch returned sent=0.
 */
export async function reconcilePushSubscription(): Promise<void> {
  if (!pb.authStore.isValid) return
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push.reconcile] VITE_VAPID_PUBLIC_KEY not set — skipping')
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    let sub = await registration.pushManager.getSubscription()

    if (!sub) {
      // Permission is granted but no browser subscription — re-create one.
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    await savePushSubscription(sub)
  } catch (err) {
    console.warn('[push.reconcile] failed:', err)
  }
}
