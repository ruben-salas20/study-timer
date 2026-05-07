// features/pwa/api/push.ts — Push subscription CRUD against PocketBase
//
// Exposes two operations:
//   savePushSubscription(sub)      — POST to push_subscriptions collection
//   removePushSubscription(endpoint) — find by endpoint + delete
//
// Both require the user to be authenticated (PocketBase rules enforce it).

import pb from '@/shared/pb'
import { serializeSubscription } from '../lib/serializeSubscription'

/** PocketBase collection name for push subscriptions */
const COLLECTION = 'push_subscriptions'

/**
 * Save a new push subscription to PocketBase.
 *
 * @param sub - A live PushSubscription from PushManager.subscribe()
 * @returns The created PocketBase record
 */
export async function savePushSubscription(sub: PushSubscription) {
  const userId = pb.authStore.model?.id as string | undefined
  if (!userId) throw new Error('User not authenticated')

  const serialized = serializeSubscription(sub)

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
