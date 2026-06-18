import { useEffect, useRef } from 'react'

/**
 * Pushes a history entry while `isOpen` is true so the device/browser back
 * button (or swipe gesture) closes the overlay via `onClose` instead of
 * navigating away from the page.
 */
export function useBackButton(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ twopotOverlay: true }, '')

    const handlePopState = (): void => {
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isOpen])
}
