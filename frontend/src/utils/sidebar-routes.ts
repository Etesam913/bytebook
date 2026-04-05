export function isSearchSidebarRoute(pathname: string): boolean {
  return pathname.startsWith('/search');
}
