import { useEffect, useState } from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { PushSubscriptionRow } from '@/types/app'

/**
 * The stored subscription is "one active device per user": whichever device
 * used the app most recently owns the row (see 028_push_single_active.sql).
 * `usePushSubscriptionRefresh` re-asserts the local device on every app open,
 * so a previously displaced device becomes active again just by reopening.
 */

/**
 * Upserts this browser's push subscription as the user's active one. The
 * `user_id` conflict target relies on 028_push_single_active.sql's unique
 * constraint (which also deduped the per-device rows that existed before).
 */
async function saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
  const keys = subscription.toJSON().keys
  const p256dh = keys?.p256dh
  const auth = keys?.auth
  if (!p256dh || !auth) {
    throw new Error('Push subscription is missing encryption keys.')
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Reads the user's existing `push_subscriptions` row, if any, so the UI can show subscribed state. */
export function usePushSetup(userId: string | undefined): UseQueryResult<PushSubscriptionRow | null> {
  return useQuery({
    queryKey: queryKeys.pushSubscription(userId ?? 'none'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId as string)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: Boolean(userId),
  })
}

/**
 * Registers for browser push via `registration.pushManager.subscribe` using
 * `VITE_VAPID_PUBLIC_KEY`, and persists the subscription to
 * `push_subscriptions`. The service worker's `push`/`notificationclick`
 * handlers that display the incoming notification live in `src/sw.ts`
 * (injectManifest build).
 */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // iOS only exposes web push (16.4+) to apps installed on the Home Screen,
    // so point the user there instead of a dead-end "unsupported" message.
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    throw new Error(
      isIos
        ? 'On iPhone/iPad, first add TwoPot to your Home Screen (Share → Add to Home Screen), then enable notifications from the installed app. Requires iOS 16.4 or later.'
        : 'Push notifications are not supported in this browser.'
    )
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(vapidKey),
  })

  await saveSubscription(userId, subscription)
}

/**
 * Best-effort: if this browser already holds a push subscription and
 * permission is still granted, re-upsert it so this device becomes the
 * user's active subscription. Returns whether a subscription was saved.
 */
export async function refreshPushSubscription(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return false
    await saveSubscription(userId, subscription)
    return true
  } catch {
    // Losing the takeover is fine; the next app open retries.
    return false
  }
}

/**
 * Re-asserts this device as the active push subscription once per app open
 * (latest-active-device-wins; see module docs).
 */
export function usePushSubscriptionRefresh(userId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return
    void refreshPushSubscription(userId).then((refreshed) => {
      if (refreshed) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscription(userId) })
      }
    })
  }, [userId, queryClient])
}

/** This browser's own push subscription endpoint, or null when none exists. */
export function useLocalPushEndpoint(): UseQueryResult<string | null> {
  return useQuery({
    queryKey: queryKeys.localPushEndpoint,
    queryFn: async (): Promise<string | null> => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return subscription?.endpoint ?? null
    },
    staleTime: Infinity,
  })
}

/**
 * Unsubscribes this browser from push. The stored row is only deleted when it
 * belongs to this device — another device's active subscription is left alone.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  let endpoint: string | null = null
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      endpoint = subscription.endpoint
      await subscription.unsubscribe()
    }
  }
  if (!endpoint) return

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
  if (error) throw error
}

/**
 * Convenience hook bundling subscription state with subscribe/unsubscribe
 * actions wired to invalidate the cached subscription row on change.
 * `isSubscribed` means *this device* holds the user's active subscription —
 * a device displaced by another one shows as unsubscribed, and enabling
 * again simply takes the active slot back.
 */
export function usePushNotificationActions(userId: string | undefined): {
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
} {
  const queryClient = useQueryClient()
  const { data, isLoading } = usePushSetup(userId)
  const { data: localEndpoint, isLoading: isEndpointLoading } = useLocalPushEndpoint()
  const [isWorking, setIsWorking] = useState(false)

  const invalidate = async (): Promise<void> => {
    if (!userId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscription(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.localPushEndpoint }),
    ])
  }

  const subscribe = async (): Promise<void> => {
    if (!userId) return
    setIsWorking(true)
    try {
      await subscribeToPush(userId)
      await invalidate()
    } finally {
      setIsWorking(false)
    }
  }

  const unsubscribe = async (): Promise<void> => {
    if (!userId) return
    setIsWorking(true)
    try {
      await unsubscribeFromPush(userId)
      await invalidate()
    } finally {
      setIsWorking(false)
    }
  }

  return {
    isSubscribed: Boolean(data && localEndpoint && data.endpoint === localEndpoint),
    isLoading: isLoading || isEndpointLoading || isWorking,
    subscribe,
    unsubscribe,
  }
}
