
import * as React from "react"

const MOBILE_BREAKPOINT = 640

export function useIsMobile() {
  // Start with false to prevent desktop from showing mobile UI initially
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT
      console.debug('Mobile detection:', { width: window.innerWidth, isMobile: newIsMobile })
      setIsMobile(newIsMobile)
    }
    mql.addEventListener("change", onChange)
    
    // Set initial value
    const initialIsMobile = window.innerWidth < MOBILE_BREAKPOINT
    console.debug('Initial mobile detection:', { width: window.innerWidth, isMobile: initialIsMobile })
    setIsMobile(initialIsMobile)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
