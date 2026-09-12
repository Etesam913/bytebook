/**
 * Centralized route definitions and utilities for the application
 */
import { navigate } from 'wouter/use-browser-location';
import {
  createFolderPath,
  stripTrailingSlash,
  type FilePath,
  type FolderPath,
} from './path';
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

/**
 * Gets the route to navigate to when the current route points at (or inside)
 * one of the deleted paths: the parent folder of the topmost affecting deleted
 * path, falling back to `/`.
 */
export function getNavigationTargetForDeletedPaths({
  currentRoutePath,
  paths,
  includeDescendants = true,
}: {
  currentRoutePath: string | null;
  paths: readonly string[];
  includeDescendants?: boolean;
}): string | null {
  if (!currentRoutePath) return null;

  // Folder paths carry a trailing slash; compare in slashless form.
  const routePath = stripTrailingSlash(currentRoutePath);

  // Filter to only paths that affect the current route (exact match or ancestor)
  const affectingPaths = paths
    .map(stripTrailingSlash)
    .filter(
      (deletedPath) =>
        deletedPath !== '' &&
        (deletedPath === routePath ||
          (includeDescendants && routePath.startsWith(deletedPath + '/')))
    );
  if (affectingPaths.length === 0) return null;

  // Find the topmost (shallowest) affecting path — fewest segments
  const topmostPath = affectingPaths.reduce((shallowest, path) => {
    const depth = path.split('/').filter(Boolean).length;
    const shallowestDepth = shallowest.split('/').filter(Boolean).length;
    return depth <= shallowestDepth ? path : shallowest;
  });

  const parentPath = topmostPath.split('/').slice(0, -1).join('/');
  if (!parentPath) return '/';
  return createFolderPath(parentPath)?.encodedFolderUrl ?? '/';
}
