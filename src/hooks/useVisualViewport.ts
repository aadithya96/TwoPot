import { useEffect, useState } from 'react'

/**
 * Tracks `window.visualViewport.height` (useful for adapting layout when the
 * on-screen keyboard opens), falling back to `null` when unsupported.
 */
export function useVisualViewport(): { height: number | null } {
  const [height, setHeight] = useState<number | null>(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return null
    return window.visualViewport.height
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const viewport = window.visualViewport
    const handleResize = (): void => {
      setHeight(viewport.height)
    }

    viewport.addEventListener('resize', handleResize)
    return () => {
      viewport.removeEventListener('resize', handleResize)
    }
  }, [])

  return { height }
}
