// usePushSubscription.ts — Subscribe/unsubscribe to Web Push + sync with PocketBase
//
// Manages the full lifecycle of a push subscription:
//   1. Waits for the service worker to be ready
//   2. Subscribes with the VAPID public key from VITE_VAPID_PUBLIC_KEY
//   3. Persists the subscription to PocketBase (push_subscriptions)
//   4. On unsubscribe, removes from PocketBase and revokes the browser subscription
//
// Security note: VITE_VAPID_PUBLIC_KEY is the public key — it is safe to ship
// in the frontend bundle. Never include the private key here.

import { useState, useCallback, useEffect } from 'react'
import { urlBase64ToUint8Array } from '../lib/urlBase64ToUint8Array'
import { savePushSubscription, removePushSubscription } from '../api/push'

const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

interface UsePushSubscriptionReturn {
  /** Whether the user is currently subscribed to push notifications */
  isSubscribed: boolean
  /** Whether a subscribe/unsubscribe operation is in progress */
  isLoading: boolean
  /** The active PushSubscription or null if not subscribed */
  subscription: PushSubscription | null
  /** Subscribe to push notifications */
  subscribe: () => Promise<void>
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<void>
  /** Error from the last operation, or null */
  error: Error | null
}

export function usePushSubscription(): UsePushSubscriptionReturn {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Detect existing subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    let cancelled = false
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscription(sub)
      })
      .catch((err) => {
        if (!cancelled) console.warn('[usePushSubscription] getSubscription failed:', err)
      })

    return () => { cancelled = true }
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      setError(new Error('VITE_VAPID_PUBLIC_KEY is not configured'))
      return
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError(new Error('Push notifications are not supported in this browser'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      await savePushSubscription(sub)
      setSubscription(sub)
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err))
      setError(wrapped)
      console.error('[usePushSubscription] subscribe failed:', wrapped)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    if (!subscription) return

    setIsLoading(true)
    setError(null)

    try {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      await removePushSubscription(endpoint)
      setSubscription(null)
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err))
      setError(wrapped)
      console.error('[usePushSubscription] unsubscribe failed:', wrapped)
    } finally {
      setIsLoading(false)
    }
  }, [subscription])

  return {
    isSubscribed: subscription !== null,
    isLoading,
    subscription,
    subscribe,
    unsubscribe,
    error,
  }
}
