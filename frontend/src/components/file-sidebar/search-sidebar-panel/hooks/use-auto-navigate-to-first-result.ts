import { useEffect, type RefObject } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../../../utils/routes';
import { safeDecodeURIComponent } from '../../../../utils/path';

/**
 * Automatically navigates to the first search result after a short debounce
 * when the search query or first result changes.
 * Skips navigation if the query hasn't actually changed (e.g. switching sidebar modes).
 */
export function useAutoNavigateToFirstResult({
  internalSearchQuery,
  firstResultPath,
  lastSearchRouteRef,
  searchInputRef,
}: {
  internalSearchQuery: string;
  firstResultPath: string | undefined;
  lastSearchRouteRef: RefObject<string>;
  searchInputRef: RefObject<HTMLInputElement | null>;
}) {
  useEffect(() => {
    const [, , lastSearchQueryEncoded] = lastSearchRouteRef.current.split('/');
    const lastSearchQuery = safeDecodeURIComponent(lastSearchQueryEncoded);

    // Prevents navigating to the first result when the user goes from the file sidebar to the search-sidebar
    if (internalSearchQuery === lastSearchQuery) {
      searchInputRef.current?.focus();
      return;
    }

    const timeoutId = setTimeout(() => {
      const nextRoute = routeUrls.search(internalSearchQuery, firstResultPath);
      lastSearchRouteRef.current = nextRoute;
      navigate(nextRoute);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [firstResultPath, internalSearchQuery, lastSearchRouteRef]);
}
