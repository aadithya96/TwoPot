import { useEffect, useRef, useState } from 'react'

/**
 * Reports whether the element bound to `ref` is currently intersecting the
 * viewport (or a custom root), used to defer rendering expensive content
 * such as charts until it scrolls into view.
 */
export function useInView(options?: IntersectionObserverInit): {
  ref: React.RefObject<HTMLDivElement | null>
  inView: boolean
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true)
      }
    }, optionsRef.current)

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  return { ref, inView }
}
