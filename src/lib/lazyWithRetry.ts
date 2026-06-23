import { lazy, type ComponentType } from 'react'

// `ComponentType<any>` (as React's own `lazy` uses) is required so the wrapped
// component's prop types are preserved through inference.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ImportFactory<T extends ComponentType<any>> = () => Promise<{ default: T }>

/** sessionStorage flag that records we've already forced a reload for a failed chunk. */
const RELOAD_FLAG = 'twopot:chunk-reload'

/**
 * Like `React.lazy`, but resilient to stale-chunk failures after a deploy.
 *
 * When the app is redeployed, the hashed page chunks referenced by an
 * already-open tab no longer exist on the server, so the next dynamic import
 * throws "Failed to fetch dynamically imported module". This wrapper forces a
 * one-time full reload, which pulls the fresh index.html and current chunk
 * names. A sessionStorage flag guards against an infinite reload loop when the
 * chunk is genuinely unreachable (e.g. the user is offline).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(factory: ImportFactory<T>) {
  return lazy(async () => {
    try {
      const component = await factory()
      // Loaded fine — clear the guard so a future stale chunk can reload again.
      window.sessionStorage.removeItem(RELOAD_FLAG)
      return component
    } catch (error) {
      const alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG) === 'true'
      if (!alreadyReloaded) {
        window.sessionStorage.setItem(RELOAD_FLAG, 'true')
        window.location.reload()
        // Never resolve, so the Suspense fallback stays up until the reload lands.
        return new Promise<{ default: T }>(() => {})
      }
      // Already retried once and still failing — surface the real error.
      throw error
    }
  })
}
