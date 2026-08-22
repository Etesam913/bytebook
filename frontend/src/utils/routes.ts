/**
 * Centralized route definitions and utilities for the application
 */
import { navigate } from 'wouter/use-browser-location';
import type { FilePath, FolderPath } from './path';
import { FOLDER_TYPE } from './tree-item-types';

/** Navigates to the route for a typed file or folder path. */
export function navigateToPath(
  target: FilePath | FolderPath,
  options?: { replace?: boolean }
) {
  navigate(
    target.type === FOLDER_TYPE
      ? target.encodedFolderUrl
      : target.encodedFileUrl,
    options
  );
}

export type KernelWithFilesRouteParams = {
  kernelName: string;
  folder?: string;
  note?: string;
};

export type NotesRouteParams = {
  '*'?: string;
};

// Route patterns (used in Route components and useRoute hooks)
export const ROUTE_PATTERNS = {
  ROOT: '/',
  KERNELS: '/kernels/:kernelName',
  KERNELS_WITH_FILES: '/kernels/:kernelName/:folder?/:note?',
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
   * Build kernel route
   */
  kernel: (kernelName: string) => `/kernels/${encodeURIComponent(kernelName)}`,

  /**
   * Build folder route
   */
  folder: (folderName: string) => `/notes/${encodeURIComponent(folderName)}`,

  /**
   * Build 404 fallback route
   */
  notFoundFallback: () => '/404',
};

// Main routeUrls object combining patterns and builders
export const routeUrls = {
  // Route patterns for Route components and useRoute hooks
  patterns: ROUTE_PATTERNS,

  // Route builders for navigation
  ...routeBuilders,
} as const;
