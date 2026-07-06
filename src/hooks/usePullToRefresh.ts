import { useEffect, useRef, useState } from 'react'

/** Finger travel (px) past which releasing triggers a refresh. */
const PULL_THRESHOLD_PX = 64
/** Cap on the visible indicator travel; the pull is damped past this. */
const MAX_PULL_PX = 96
/** Resistance factor so the indicator lags the finger for a rubber-band feel. */
const PULL_RESISTANCE = 0.5

/** State returned by {@link usePullToRefresh}. */
export interface PullToRefreshState {
  /** Attach to the scrollable container. */
  ref: React.RefObject<HTMLDivElement | null>
  /** True while `onRefresh` is in flight (show a spinner). */
  isRefreshing: boolean
  /** Current damped pull distance in px (0 when idle), for a live indicator. */
  pullDistance: number
}

/**
 * Touch pull-to-refresh for a scrollable container: while already scrolled to
 * the top, dragging down past {@link PULL_THRESHOLD_PX} and releasing invokes
 * `onRefresh`. `pullDistance` follows the finger (damped) so the caller can
 * render an indicator, and `isRefreshing` stays true until the returned
 * promise settles. Mirrors the native Android/iOS gesture.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void): PullToRefreshState {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
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
    let distance = 0

    const reset = (): void => {
      pulling = false
      distance = 0
      setPullDistance(0)
    }

    const handleTouchStart = (event: TouchEvent): void => {
      // Only arm the gesture from the very top of the scroll area, and never
      // mid-refresh, so ordinary upward scrolling is left untouched.
      if (element.scrollTop > 0 || refreshing) {
        pulling = false
        return
      }
      startY = event.touches[0]?.clientY ?? 0
      pulling = true
      distance = 0
    }

    const handleTouchMove = (event: TouchEvent): void => {
      if (!pulling || refreshing) return
      const currentY = event.touches[0]?.clientY ?? 0
      const delta = currentY - startY
      // A scroll started at the top can still move upward; bail so we don't
      // fight native scrolling.
      if (delta <= 0 || element.scrollTop > 0) {
        reset()
        return
      }
      // Prevent the browser's native overscroll/rubber-band so our own
      // indicator is the only thing that moves. Requires a non-passive listener.
      if (event.cancelable) event.preventDefault()
      distance = Math.min(delta * PULL_RESISTANCE, MAX_PULL_PX)
      setPullDistance(distance)
    }

    const handleTouchEnd = (): void => {
      if (!pulling) return
      if (distance >= PULL_THRESHOLD_PX) {
        refreshing = true
        setIsRefreshing(true)
        setPullDistance(PULL_THRESHOLD_PX)
        void Promise.resolve(onRefreshRef.current()).finally(() => {
          refreshing = false
          setIsRefreshing(false)
          setPullDistance(0)
        })
      } else {
        setPullDistance(0)
      }
      pulling = false
      distance = 0
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    // Non-passive so `preventDefault` can suppress native overscroll.
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [])

  return { ref, isRefreshing, pullDistance }
}
