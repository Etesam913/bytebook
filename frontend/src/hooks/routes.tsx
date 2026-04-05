import { useRoute } from 'wouter';
import {
  FolderPath,
  FilePath,
  createFolderPath,
  createFilePath,
  safeDecodeURIComponent,
} from '../utils/path';
import {
  NotesRouteParams,
  SavedSearchRouteParams,
  SearchRouteParams,
} from '../utils/routes';

function normalizeWildcardPath(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  return safeDecodeURIComponent(path).split('/').filter(Boolean).join('/');
}

/**
 * Hook to get the decoded wildcard path segment from the `/notes/*` route.
 * The route param is URI-decoded and normalized by removing extra slashes.
 *
 * @returns The normalized path from the route, or null if not on `/notes/*`
 */
function useDecodedNotesWildcardPath(): string | null {
  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>('/notes/*');
  if (!isNoteRoute) {
    return null;
  }

  return normalizeWildcardPath(noteParams['*']);
}

/**
 * Hook to get the decoded wildcard path segment from the
 * `/saved-search/:searchQuery/*` route.
 *
 * @returns The normalized file path from the route, or null if not on a
 * saved-search note route.
 */
function useDecodedSavedSearchWildcardPath(): string | null {
  const [isSavedSearchRoute, savedSearchParams] =
    useRoute<SavedSearchRouteParams>('/saved-search/:searchQuery/*');
  if (!isSavedSearchRoute) {
    return null;
  }

  return normalizeWildcardPath(savedSearchParams['*']);
}

/**
 * Hook to get the decoded wildcard path segment from the
 * `/search/:searchQuery/*` route.
 *
 * @returns The normalized file path from the route, or null if not on a
 * search note route.
 */
function useDecodedSearchWildcardPath(): string | null {
  const [isSearchRoute, searchParams] = useRoute<SearchRouteParams>(
    '/search/:searchQuery/*'
  );
  if (!isSearchRoute) {
    return null;
  }

  return normalizeWildcardPath(searchParams['*']);
}

/**
 * Hook to get a FilePath object representing the current `/notes/*` route.
 *
 * @returns FilePath object if on a file route, null if not or if invalid.
 */
export function useFilePathFromRoute(): FilePath | null {
  const decodedPath = useDecodedNotesWildcardPath();
  return decodedPath ? createFilePath(decodedPath) : null;
}

/**
 * Hook to get a FolderPath object representing the current `/notes/*` route.
 *
 * @returns FolderPath object if on a folder route, null if not or if invalid.
 */
export function useFolderPathFromRoute(): FolderPath | null {
  const decodedPath = useDecodedNotesWildcardPath();
  return decodedPath ? createFolderPath(decodedPath) : null;
}

/**
 * Hook to get the current note or folder represented by the active route.
 *
 * Supports both `/notes/*` routes and saved-search note routes.
 *
 * @returns FilePath or FolderPath for the current route, or null if the route
 * does not correspond to a note or folder.
 */
export function useRecentItemFromRoute(): FilePath | FolderPath | null {
  const decodedNotesPath = useDecodedNotesWildcardPath();
  const decodedSavedSearchPath = useDecodedSavedSearchWildcardPath();
  const decodedSearchPath = useDecodedSearchWildcardPath();

  if (decodedNotesPath) {
    return (
      createFilePath(decodedNotesPath) ?? createFolderPath(decodedNotesPath)
    );
  }

  if (decodedSavedSearchPath) {
    return createFilePath(decodedSavedSearchPath);
  }

  if (decodedSearchPath) {
    return createFilePath(decodedSearchPath);
  }

  return null;
}

/**
 * Hook to get a FolderPath object for the current `/notes/*` route.
 * If the route points to a file, returns the parent folder.
 * If it points to a folder path, returns that folder.
 *
 * @returns FolderPath object or null if not resolvable.
 */
export function useCurrentNotesRouteFolderPath(): FolderPath | null {
  const decodedPath = useDecodedNotesWildcardPath();
  if (!decodedPath) {
    return null;
  }

  const filePath = createFilePath(decodedPath);
  if (filePath) {
    return createFolderPath(filePath.folder);
  }

  return createFolderPath(decodedPath);
}
