import { useCallback, useEffect, useRef, useState } from 'react'

const REVEAL_THRESHOLD_PX = 64
const MAX_OFFSET_PX = 96
// Below this much horizontal movement we treat the gesture as a tap rather than
// a drag, so a normal press still opens the row instead of nudging it.
const DIRECTION_LOCK_PX = 8

/**
 * Pointer-event based left-swipe-to-reveal gesture for list rows. Attach the
 * returned `ref` to the swipeable element and translate it by `offsetX`.
 *
 * Once a swipe passes the reveal threshold the row snaps open (`isRevealed`
 * becomes `true`) so the consumer can render a delete affordance; swiping the
 * other way — or calling `reset()` — snaps it closed again. Tapping the delete
 * affordance and invoking the delete is the consumer's responsibility; this
 * hook only tracks the gesture.
 *
 * `isDragging` is `true` only while the finger is actively moving the row, so
 * the consumer can drop the CSS transition mid-drag (to track the finger 1:1)
 * and re-enable it on release for a smooth settle.
 *
 * To keep an accidental `click` from firing after a horizontal swipe (which
 * would otherwise open the row's tap target), the hook swallows the trailing
 * click on the element in the capture phase.
 *
 * Apply `style={{ touchAction: 'pan-y' }}` (or an equivalent CSS class) to the
 * element so the browser still allows vertical list scrolling while this hook
 * handles horizontal drags.
 */
export function useSwipeToDelete(): {
  ref: React.RefObject<HTMLDivElement | null>
  offsetX: number
  isRevealed: boolean
  isDragging: boolean
  reset: () => void
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [offsetX, setOffsetX] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  // Mirrors `isRevealed` for the event listeners, which close over the initial
  // render and can't read the latest state directly.
  const revealedRef = useRef(false)

  const reset = useCallback(() => {
    revealedRef.current = false
    setIsRevealed(false)
    setIsDragging(false)
    setOffsetX(0)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let startX = 0
    let startY = 0
    let dragging = false
    let isHorizontal = false
    // Where the row rests when the drag begins, so a swipe that starts on an
    // already-revealed row continues from -MAX_OFFSET_PX instead of jumping.
    let baseOffset = 0
    // Set once a horizontal drag completes so the trailing synthetic click can
    // be swallowed before it reaches the row's tap handler.
    let suppressClick = false

    const handlePointerDown = (event: PointerEvent): void => {
      startX = event.clientX
      startY = event.clientY
      dragging = true
      isHorizontal = false
      suppressClick = false
      baseOffset = revealedRef.current ? -MAX_OFFSET_PX : 0
    }

    const handlePointerMove = (event: PointerEvent): void => {
      if (!dragging) return
      const deltaX = event.clientX - startX
      const deltaY = event.clientY - startY

      if (!isHorizontal) {
        if (Math.abs(deltaX) < DIRECTION_LOCK_PX && Math.abs(deltaY) < DIRECTION_LOCK_PX) return
        isHorizontal = Math.abs(deltaX) > Math.abs(deltaY)
        if (!isHorizontal) {
          // Vertical intent: let the list scroll and stop tracking this gesture.
          dragging = false
          return
        }
        setIsDragging(true)
        // Keep receiving move/up events even if the finger slides off the
        // translated row.
        element.setPointerCapture?.(event.pointerId)
      }

      const clamped = Math.min(0, Math.max(-MAX_OFFSET_PX, baseOffset + deltaX))
      setOffsetX(clamped)
    }

    const finishDrag = (): void => {
      if (!dragging) return
      dragging = false
      if (!isHorizontal) return
      setIsDragging(false)
      suppressClick = true

      setOffsetX((current) => {
        const revealed = Math.abs(current) >= REVEAL_THRESHOLD_PX
        revealedRef.current = revealed
        setIsRevealed(revealed)
        return revealed ? -MAX_OFFSET_PX : 0
      })
    }

    const handleClickCapture = (event: MouseEvent): void => {
      if (!suppressClick) return
      suppressClick = false
      event.stopPropagation()
      event.preventDefault()
    }

    element.addEventListener('pointerdown', handlePointerDown)
    element.addEventListener('pointermove', handlePointerMove)
    element.addEventListener('pointerup', finishDrag)
    element.addEventListener('pointercancel', finishDrag)
    element.addEventListener('click', handleClickCapture, true)

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown)
      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerup', finishDrag)
      element.removeEventListener('pointercancel', finishDrag)
      element.removeEventListener('click', handleClickCapture, true)
    }
  }, [])

  return { ref, offsetX, isRevealed, isDragging, reset }
}
