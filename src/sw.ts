/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa `injectManifest` strategy).
//
// Replicates what the previous `generateSW` build produced — precaching with
// cleanup, SPA navigation fallback, and NetworkFirst caching for the Supabase
// REST/auth APIs — and adds the Web Push handlers that generateSW cannot
// express: displaying incoming `push` payloads from the `send-push` edge
// function and focusing/opening the app on notification click.

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

// registerType: 'prompt' — the UpdatePrompt component sends SKIP_WAITING when
// the user accepts an update.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

registerRoute(
  ({ url }) => url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/auth/v1'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 })],
  })
)

interface PushPayload {
  title?: string
  body?: string
  url?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  try {
    payload = (event.data?.json() as PushPayload) ?? {}
  } catch {
    // Non-JSON payload; fall back to defaults below.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'TwoPot', {
      body: payload.body ?? '',
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      data: { url: payload.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows[0]
      if (existing) {
        await existing.focus()
        await existing.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })()
  )
})
