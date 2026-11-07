/**
 * web-ui/src/components/showcase/tourPolicy.js
 *
 * Central policy engine governing when and where product showcase tours / onboarding
 * are permitted to run.
 *
 * Prevents tour overlays from intruding into dedicated, focused workspaces
 * like the Whiteboard editor, shared review links, full-screen media players,
 * or unlisted viewer modes.
 */

// Explicit pathname prefixes where onboarding / showcase tours must NEVER appear
export const TOUR_EXCLUDED_PATH_PREFIXES = [
  '/whiteboard',
  '/capture',
  '/embed',
];

/**
 * Checks whether the current application state or page context allows a tour.
 *
 * @param {Object} context
 * @param {Object|null} context.activeBoard - Board object if whiteboard is currently open
 * @param {Object|null} context.activeMedia - Media object if media modal/player is active
 * @param {string} [context.pathname] - Current window pathname
 * @param {string} [context.search] - Current window search/query string
 * @returns {boolean} true if the tour is allowed to run, false if forbidden
 */
export function isTourAllowed({ activeBoard = null, activeMedia = null, pathname = '', search = '' } = {}) {
  const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  const currentSearch = search || (typeof window !== 'undefined' ? window.location.search : '');

  // 1. If currently inside Whiteboard editor or viewing any whiteboard path
  if (activeBoard || currentPath.startsWith('/whiteboard')) {
    return false;
  }

  // 2. If viewing a shared link (view-only or edit)
  if (currentSearch.includes('access=view') || currentSearch.includes('access=edit')) {
    return false;
  }

  // 3. If currently playing a media modal or direct /capture URL
  if (activeMedia || currentPath.startsWith('/capture')) {
    return false;
  }

  // 4. Any other excluded path prefixes
  for (const prefix of TOUR_EXCLUDED_PATH_PREFIXES) {
    if (currentPath.startsWith(prefix)) {
      return false;
    }
  }

  return true;
}
