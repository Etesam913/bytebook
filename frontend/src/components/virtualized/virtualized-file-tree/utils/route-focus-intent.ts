/**
 * When a new file is created using the app context menu, the app navigates to the new file.
 * This route changes triggers the useRoutePathFocus hook to reveal the new file in the file tree.
 *
 * However, a new file that is created using the finder will not make a navigation and therefore
 * not trigger the useRoutePathFocus hook. We still want to reveal the new file to appear in the
 * file tree if its parent is open though.
 *
 * To solve this, the note:create event will imperatively trigger the useRevealRoutePath mutation
 * to reveal the new file if its parent is open.
 *
 * The app context menu new file creation will add an entry to skipRevealByPath to skip the useRoutePathFocus hook
 * and instead rely on the useRevealRoutePath mutation from the note:create event to reveal the new file.
 */
const ROUTE_FOCUS_INTENT_TTL_MS = 2_000;
const skipRevealByPath = new Map<string, number>();

/**
 * Marks a path so the next route-focus pass can skip reveal once.
 * This is used by create flows to avoid auto-expanding closed folders.
 */
export function setSkipRevealForPath(path: string): void {
  skipRevealByPath.set(path, Date.now() + ROUTE_FOCUS_INTENT_TTL_MS);
}

/**
 * Returns true only once for a non-expired skip intent.
 */
export function consumeSkipRevealForPath(path: string): boolean {
  const expiresAt = skipRevealByPath.get(path);
  if (!expiresAt) {
    return false;
  }
  skipRevealByPath.delete(path);
  return expiresAt > Date.now();
}
