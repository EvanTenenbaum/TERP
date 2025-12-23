import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect mobile viewport
 * Returns false during SSR/initial render to prevent layout flash
 * Uses matchMedia for efficient viewport detection
 */
export function useIsMobile() {
  // Initialize with a sensible default based on window width if available
  // This prevents the undefined -> boolean flash that causes layout shifts
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Check if window is available (client-side)
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    // Default to false for SSR
    return false;
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
