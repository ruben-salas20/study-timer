// usePushPermission.ts — Notification permission state + request action
//
// Returns the current Notification.permission value and a request() function
// that asks the user for permission via the Notifications API.
//
// Usage:
//   const { permission, request } = usePushPermission()

import { useState, useCallback } from 'react'

interface UsePushPermissionReturn {
  /** Current Notification.permission: 'granted' | 'denied' | 'default' */
  permission: NotificationPermission
  /** Ask the user for notification permission */
  request: () => Promise<NotificationPermission>
}

/**
 * Returns current notification permission and a stable request() function.
 * Safe to call on browsers that don't support the Notifications API —
 * returns 'denied' and a no-op request() function.
 */
export function usePushPermission(): UsePushPermissionReturn {
  const [permission, setPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'denied')
  )

  const request = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  return { permission, request }
}
