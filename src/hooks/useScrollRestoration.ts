import { useEffect } from 'react'

const STORAGE_PREFIX = 'twopot-scroll:'

/**
 * Restores `window` scroll position on mount and persists it to
 * `sessionStorage` (keyed by `key`) on unmount, so navigating back to a
 * route resumes where the user left off.
 */
export function useScrollRestoration(key: string): void {
  useEffect(() => {
    const storageKey = `${STORAGE_PREFIX}${key}`
    const saved = sessionStorage.getItem(storageKey)
    if (saved !== null) {
      const y = Number.parseInt(saved, 10)
      if (Number.isFinite(y)) {
        window.scrollTo(0, y)
      }
    }

    return () => {
      sessionStorage.setItem(storageKey, String(window.scrollY))
    }
  }, [key])
}
