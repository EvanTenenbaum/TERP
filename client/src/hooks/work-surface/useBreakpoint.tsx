/**
 * useBreakpoint Hook (UXS-701)
 *
 * Responsive breakpoint detection for Work Surfaces.
 * Provides consistent breakpoint handling across all surfaces.
 *
 * Breakpoints:
 * - Mobile: <768px
 * - Tablet: 768px - 1279px
 * - Desktop: ≥1280px
 *
 * @see ATOMIC_UX_STRATEGY.md for responsive design requirements
 */

import { useState, useEffect, useMemo, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface BreakpointState {
  /** Current breakpoint name */
  breakpoint: Breakpoint;
  /** Current viewport width */
  width: number;
  /** Is mobile (<768px) */
  isMobile: boolean;
  /** Is tablet (768-1279px) */
  isTablet: boolean;
  /** Is desktop (≥1280px) */
  isDesktop: boolean;
  /** Is at least tablet size (≥768px) */
  isAtLeastTablet: boolean;
  /** Is at least desktop size (≥1280px) */
  isAtLeastDesktop: boolean;
  /** Is touch device */
  isTouchDevice: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const BREAKPOINTS: BreakpointConfig = {
  mobile: 0,
  tablet: 768,
  desktop: 1280,
} as const;

export const BREAKPOINT_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.tablet - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  atLeastTablet: `(min-width: ${BREAKPOINTS.tablet}px)`,
  atLeastDesktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
} as const;

// ============================================================================
// Utilities
// ============================================================================

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for responsive breakpoint detection
 *
 * @example
 * ```tsx
 * const { breakpoint, isMobile, isDesktop } = useBreakpoint();
 *
 * return (
 *   <div className={isMobile ? 'stack' : 'grid'}>
 *     {isDesktop && <Sidebar />}
 *     <MainContent />
 *   </div>
 * );
 * ```
 */
export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return 1280; // SSR default
    return window.innerWidth;
  });

  const [touch, setTouch] = useState(() => isTouchDevice());

  // Update width on resize
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleResize = () => {
      // Cancel any pending updates
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);

      // Debounce with requestAnimationFrame
      rafId = requestAnimationFrame(() => {
        setWidth(window.innerWidth);
      });
    };

    // Initial check after mount
    handleResize();

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Update touch detection
  useEffect(() => {
    setTouch(isTouchDevice());
  }, []);

  // Calculate breakpoint state
  const state = useMemo((): BreakpointState => {
    const breakpoint = getBreakpoint(width);

    return {
      breakpoint,
      width,
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop',
      isAtLeastTablet: width >= BREAKPOINTS.tablet,
      isAtLeastDesktop: width >= BREAKPOINTS.desktop,
      isTouchDevice: touch,
    };
  }, [width, touch]);

  return state;
}

// ============================================================================
// Media Query Hook
// ============================================================================

/**
 * Hook for custom media query matching
 *
 * @example
 * ```tsx
 * const isLandscape = useMediaQuery('(orientation: landscape)');
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

// ============================================================================
// Responsive Value Hook
// ============================================================================

/**
 * Hook for responsive values based on breakpoint
 *
 * @example
 * ```tsx
 * const columns = useResponsiveValue({ mobile: 1, tablet: 2, desktop: 4 });
 * const padding = useResponsiveValue({ mobile: 16, desktop: 32 });
 * ```
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const { breakpoint } = useBreakpoint();

  return useMemo(() => {
    // Return value for current breakpoint, or fall back to smaller breakpoints
    if (breakpoint === 'desktop') {
      return values.desktop ?? values.tablet ?? values.mobile;
    }
    if (breakpoint === 'tablet') {
      return values.tablet ?? values.mobile;
    }
    return values.mobile;
  }, [breakpoint, values]);
}

// ============================================================================
// Responsive Class Helper
// ============================================================================

/**
 * Helper to generate responsive class names
 *
 * @example
 * ```tsx
 * const className = responsiveClass({
 *   mobile: 'flex-col gap-2',
 *   tablet: 'flex-row gap-4',
 *   desktop: 'grid grid-cols-4 gap-6',
 * });
 * ```
 */
export function responsiveClass(
  classes: Partial<Record<Breakpoint, string>>,
  current: Breakpoint
): string {
  if (current === 'desktop') {
    return classes.desktop ?? classes.tablet ?? classes.mobile ?? '';
  }
  if (current === 'tablet') {
    return classes.tablet ?? classes.mobile ?? '';
  }
  return classes.mobile ?? '';
}

// ============================================================================
// Container Query Hook (Future Enhancement)
// ============================================================================

/**
 * Hook for container query support
 * Uses ResizeObserver to detect container width
 *
 * @example
 * ```tsx
 * const { ref, width, breakpoint } = useContainerQuery();
 *
 * return (
 *   <div ref={ref} className={breakpoint === 'narrow' ? 'stack' : 'grid'}>
 *     ...
 *   </div>
 * );
 * ```
 */
export function useContainerQuery<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const [ref, setRef] = useState<T | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  const containerBreakpoint = useMemo(() => {
    if (width >= 800) return 'wide';
    if (width >= 400) return 'medium';
    return 'narrow';
  }, [width]);

  const refCallback = useCallback((node: T | null) => {
    setRef(node);
  }, []);

  return {
    ref: refCallback,
    width,
    breakpoint: containerBreakpoint,
    isNarrow: containerBreakpoint === 'narrow',
    isMedium: containerBreakpoint === 'medium',
    isWide: containerBreakpoint === 'wide',
  };
}

export default useBreakpoint;
