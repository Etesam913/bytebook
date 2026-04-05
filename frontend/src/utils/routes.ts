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
  '*'?: string;
};

export type SearchRouteParams = {
  searchQuery: string;
  '*'?: string;
};

export type NotesRouteParams = {
  '*'?: string;
};

// Route patterns (used in Route components and useRoute hooks)
export const ROUTE_PATTERNS = {
  ROOT: '/',
  KERNELS: '/kernels/:kernelName',
  KERNELS_WITH_FILES: '/kernels/:kernelName/:folder?/:note?',
  SEARCH: '/search/:searchQuery?/*',
  SAVED_SEARCH: '/saved-search/:searchQuery/*',
  NOTES: '/notes/*',
  CATCH_ALL: '*',
  NOT_FOUND_FALLBACK: '/404',
} as const;

// Route builders - functions to construct routes with parameters
const routeBuilders = {
  /**
   * Build root route
   */
  root: () => '/',

  /**
   * Build search route
   */
  search: (searchQuery: string, encodedFilePath?: string) => {
    const baseRoute = `/search/${encodeURIComponent(searchQuery)}`;
    if (encodedFilePath) {
      return `${baseRoute}/${encodedFilePath}`;
    }
    return searchQuery ? `${baseRoute}/` : '/search/';
  },

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
      focus?: boolean;
    }
  ) => {
    const baseRoute = `/notes/${encodeURIComponent(folder)}/${fileName}`;

    if (!options?.focus) {
      return baseRoute;
    }

    const params = new URLSearchParams();
    if (options.focus) params.set('focus', 'true');

    return `${baseRoute}?${params.toString()}`;
  },

  /**
   * Build note route with current location preserved for focus
   */
  noteWithFocus: (location: string) => {
    const url = new URL(location, 'http://localhost');
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
  tagSearch: (tagName: string) => routeBuilders.savedSearch('#' + tagName),

  /**
   * Build saved search route
   */
  savedSearch: (searchQuery: string, encodedFilePath?: string) => {
    const baseRoute = `/saved-search/${encodeURIComponent(searchQuery)}`;
    if (encodedFilePath) {
      return `${baseRoute}/${encodedFilePath}`;
    }
    return searchQuery ? `${baseRoute}/` : '/saved-search/';
  },
};

// Main routeUrls object combining patterns and builders
export const routeUrls = {
  // Route patterns for Route components and useRoute hooks
  patterns: ROUTE_PATTERNS,

  // Route builders for navigation
  ...routeBuilders,
} as const;
