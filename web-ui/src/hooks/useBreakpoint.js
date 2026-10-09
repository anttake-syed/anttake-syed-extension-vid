import { useSyncExternalStore } from 'react';
import { BREAKPOINTS } from '../styles/breakpoints';

// Returns true while the viewport is at least `name` wide (mobile-first).
// Prefer CSS for layout; use this only when the *markup* must differ
// (e.g. rendering a drawer vs. an inline panel).
export function useBreakpoint(name) {
  const query = `(min-width: ${BREAKPOINTS[name]}px)`;
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
