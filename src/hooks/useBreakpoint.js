/**
 * useMediaQuery / useBreakpoint — viewport-aware responsive helpers.
 *
 *   const isPhone = useMediaQuery('(max-width: 640px)')
 *
 *   const { isPhone, isTabletDown, name } = useBreakpoint()
 *   <div style={{ gridTemplateColumns: isPhone ? '1fr' : '2fr 1fr' }}/>
 *
 * Philosophy: kit components stay viewport-agnostic and adapt to their own
 * container (see TopBar / DashboardGrid, which use ResizeObserver). Reach for
 * these hooks at the *glue/app* level — to reflow a layout or to branch into a
 * different component tree (e.g. a mobile shell) below a breakpoint.
 *
 * SSR-safe: returns `false` (desktop-first) when `window` is unavailable, then
 * corrects on mount.
 */
import { useEffect, useState } from 'react'

// max-width thresholds (px). A "phone" is <= phone; a "tablet" is <= tablet.
export const BREAKPOINTS = { phone: 640, tablet: 1024 }

const canMatch = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

/** Subscribe to a CSS media query string; returns whether it currently matches. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (canMatch() ? window.matchMedia(query).matches : false))

  useEffect(() => {
    if (!canMatch()) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()                       // sync in case the query changed
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Named breakpoint state for the current viewport width.
 * Returns `{ name, isPhone, isTablet, isTabletDown, isDesktop }`.
 *   - isPhone       : <= BREAKPOINTS.phone
 *   - isTablet      : phone  < w <= tablet   (the tablet band only)
 *   - isTabletDown  : <= BREAKPOINTS.tablet  (phone OR tablet — the common case)
 *   - isDesktop     : >  BREAKPOINTS.tablet
 */
export function useBreakpoint() {
  const isPhone = useMediaQuery(`(max-width: ${BREAKPOINTS.phone}px)`)
  const isTabletDown = useMediaQuery(`(max-width: ${BREAKPOINTS.tablet}px)`)
  const name = isPhone ? 'phone' : isTabletDown ? 'tablet' : 'desktop'
  return { name, isPhone, isTablet: isTabletDown && !isPhone, isTabletDown, isDesktop: !isTabletDown }
}
