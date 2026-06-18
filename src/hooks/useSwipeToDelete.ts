import { useEffect, useRef, useState } from 'react'

const REVEAL_THRESHOLD_PX = 64
const MAX_OFFSET_PX = 96

/**
 * Pointer-event based left-swipe-to-reveal gesture for list rows. Attach the
 * returned `ref` to the swipeable element. Once the swipe passes the reveal
 * threshold, `isRevealed` becomes `true` so the consumer can render a delete
 * button (tapping it is the consumer's responsibility — this hook never
 * calls `onDelete` itself). Apply `style={{ touchAction: 'pan-y' }}` (or an
 * equivalent CSS class) to the element so the browser still allows vertical
 * list scrolling while this hook handles horizontal drags.
 */
export function useSwipeToDelete(onDelete: () => void): {
  ref: React.RefObject<HTMLDivElement | null>
  offsetX: number
  isRevealed: boolean
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  // `onDelete` is intentionally not invoked here — see JSDoc above; kept in
  // the signature so callers' intent is documented and future revisions
  // (e.g. swipe-past-max auto-delete) can wire it in without an API change.
  void onDelete

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let startX = 0
    let startY = 0
    let dragging = false
    let isHorizontal = false

    const handlePointerDown = (event: PointerEvent): void => {
      startX = event.clientX
      startY = event.clientY
      dragging = true
      isHorizontal = false
    }

    const handlePointerMove = (event: PointerEvent): void => {
      if (!dragging) return
      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY

      if (!isHorizontal) {
        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return
        isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)
        if (!isHorizontal) {
          dragging = false
          return
        }
      }

      const clamped = Math.min(0, Math.max(-MAX_OFFSET_PX, deltaX))
      setOffsetX(clamped)
    }

    const handlePointerUp = (): void => {
      if (!dragging) return
      dragging = false
      if (!isHorizontal) return

      setOffsetX((current) => {
        if (Math.abs(current) >= REVEAL_THRESHOLD_PX) {
          setIsRevealed(true)
          return -MAX_OFFSET_PX
        }
        setIsRevealed(false)
        return 0
      })
    }

    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointermove', handlePointerMove)
    element.addEventListener('pointerup', handlePointerUp)
    element.addEventListener('pointercancel', handlePointerUp)

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerup', handlePointerUp)
      element.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [])

  return { ref, offsetX, isRevealed }
}
