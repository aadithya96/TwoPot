import { useState } from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { PushSubscriptionRow } from '@/types/app'

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
 * `push_subscriptions`. Note: the corresponding service-worker `push` event
 * handler (to display notifications) is not wired here — that requires a
 * custom workbox build step (`injectManifest` + a hand-written sw.ts) which
 * is out of scope; the hook for that would live in `vite.config.ts`'s
 * `VitePWA` options and a `src/sw.ts` push/notificationclick listener.
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

/** Unsubscribes from browser push and removes the stored `push_subscriptions` row. */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
  }

  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId)
  if (error) throw error
}

/**
 * Convenience hook bundling subscription state with subscribe/unsubscribe
 * actions wired to invalidate the cached subscription row on change.
 */
export function usePushNotificationActions(userId: string | undefined): {
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
} {
  const queryClient = useQueryClient()
  const { data, isLoading } = usePushSetup(userId)
  const [isWorking, setIsWorking] = useState(false)

  const subscribe = async (): Promise<void> => {
    if (!userId) return
    setIsWorking(true)
    try {
      await subscribeToPush(userId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscription(userId) })
    } finally {
      setIsWorking(false)
    }
  }

  const unsubscribe = async (): Promise<void> => {
    if (!userId) return
    setIsWorking(true)
    try {
      await unsubscribeFromPush(userId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.pushSubscription(userId) })
    } finally {
      setIsWorking(false)
    }
  }

  return { isSubscribed: Boolean(data), isLoading: isLoading || isWorking, subscribe, unsubscribe }
}
