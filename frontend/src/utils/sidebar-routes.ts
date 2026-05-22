// Returns true if the given pathname corresponds to the search sidebar route.
export function isSearchSidebarRoute(pathname: string): boolean {
  return pathname.startsWith('/search');
}
