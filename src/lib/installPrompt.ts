/**
 * Captures the browser's PWA install prompt so the Settings page can offer an
 * "Add to Home Screen" action. Chrome/Edge fire `beforeinstallprompt` once,
 * early in the page lifecycle — before any settings UI mounts — so the event
 * must be stashed at boot (see `initInstallPromptCapture()` in main.tsx) and
 * read later through the subscribe/get pair (useSyncExternalStore-shaped).
 * Safari (iOS and macOS) never fires the event; UI should fall back to manual
 * "Share → Add to Home Screen" instructions there.
 */

/** The non-standard `beforeinstallprompt` event Chrome/Edge dispatch. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** Starts listening for the install prompt. Call once, as early as possible. */
export function initInstallPromptCapture(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Stop Chrome's own mini-infobar; we re-trigger the prompt from Settings.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

/** Subscribes to prompt availability changes; returns an unsubscribe. */
export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The stashed prompt event, or null when unavailable (used/unsupported). */
export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

/** Drops a consumed prompt (it can only be used once per page load). */
export function clearInstallPrompt(): void {
  deferredPrompt = null
  notify()
}

/** Whether the app is already running as an installed app. */
export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
