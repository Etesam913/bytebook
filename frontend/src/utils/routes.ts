/**
 * Centralized route definitions and utilities for the application
 */

export type KernelWithFilesRouteParams = {
  kernelName: string;
  folder?: string;
  note?: string;
};

export type SavedSearchRouteParams = {
  searchQuery: string;
  folder?: string;
  note?: string;
};

export type NotesRouteParams = {
  folder: string;
  note?: string;
};

// Route patterns (used in Route components and useRoute hooks)
export const ROUTE_PATTERNS = {
  ROOT: '/',
  SEARCH: '/search',
  KERNELS: '/kernels/:kernelName',
  KERNELS_WITH_FILES: '/kernels/:kernelName/:folder?/:note?',
  SAVED_SEARCH: '/saved-search/:searchQuery/:folder?/:note?',
  NOTES: '/notes/:folder/:note?',
  CATCH_ALL: '*',
  NOT_FOUND_FALLBACK: '/404',
} as const;

// Route builders - functions to construct routes with parameters
export const routeBuilders = {
  /**
   * Build root route
   */
  root: () => '/',

  /**
   * Build search route
   */
  search: () => '/search',

  /**
   * Build kernel route
   */
  kernel: (kernelName: string) => `/kernels/${encodeURIComponent(kernelName)}`,

  /**
   * Build folder route
   */
  folder: (folderName: string) => `/notes/${encodeURIComponent(folderName)}`,

  /**
   * Build note route with optional query parameters
   */
  note: (
    folder: string,
    fileName: string,
    options?: {
      ext?: string;
      focus?: boolean;
    }
  ) => {
    const baseRoute = `/notes/${encodeURIComponent(folder)}/${fileName}`;

    if (!options?.ext && !options?.focus) {
      return baseRoute;
    }

    const params = new URLSearchParams();
    if (options.ext) params.set('ext', options.ext);
    if (options.focus) params.set('focus', 'true');

    return `${baseRoute}?${params.toString()}`;
  },

  /**
   * Build note route with current location preserved for focus
   */
  noteWithFocus: (location: string, ext: string) => {
    const url = new URL(location, 'http://localhost');
    url.searchParams.set('ext', ext);
    url.searchParams.set('focus', 'true');
    return `${url.pathname}${url.search}`;
  },

  /**
   * Build 404 fallback route
   */
  notFoundFallback: () => '/404',

  /**
   * Build tag search route (saved search with tag format)
   */
  tagSearch: (tagName: string) =>
    `/saved-search/${encodeURIComponent('#' + tagName)}`,

  /**
   * Build saved search route
   */
  savedSearch: (searchQuery: string) =>
    `/saved-search/${encodeURIComponent(searchQuery)}`,
};

// Main routeUrls object combining patterns and builders
export const routeUrls = {
  // Route patterns for Route components and useRoute hooks
  patterns: ROUTE_PATTERNS,

  // Route builders for navigation
  ...routeBuilders,
} as const;
