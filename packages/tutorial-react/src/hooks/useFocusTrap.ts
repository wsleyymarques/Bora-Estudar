// packages/tutorial-react/src/hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react'

export function useFocusTrap(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (!enabled || !containerRef.current) return
    
    const container = containerRef.current
    previousActiveElement.current = document.activeElement as HTMLElement
    
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    firstElement?.focus()
    
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      previousActiveElement.current?.focus()
    }
  }, [enabled])
  
  return containerRef
}