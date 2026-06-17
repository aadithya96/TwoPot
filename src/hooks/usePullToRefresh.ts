import { useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD_PX = 64

/**
 * Touch-based pull-to-refresh on a scrollable container: pulling down past a
 * threshold while already scrolled to the top invokes `onRefresh`.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void): {
  ref: React.RefObject<HTMLDivElement | null>
  isRefreshing: boolean
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let startY = 0
    let pulling = false
    let refreshing = false

    const handleTouchStart = (event: TouchEvent): void => {
      if (element.scrollTop > 0 || refreshing) {
        pulling = false
        return
      }
      startY = event.touches[0]?.clientY ?? 0
      pulling = true
    }

    const handleTouchMove = (event: TouchEvent): void => {
      if (!pulling || refreshing) return
      const currentY = event.touches[0]?.clientY ?? 0
      if (currentY - startY > PULL_THRESHOLD_PX) {
        pulling = false
        refreshing = true
        setIsRefreshing(true)
        void Promise.resolve(onRefreshRef.current()).finally(() => {
          refreshing = false
          setIsRefreshing(false)
        })
      }
    }

    const handleTouchEnd = (): void => {
      pulling = false
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return { ref, isRefreshing }
}
