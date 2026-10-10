import { useAllPaths } from './all-paths';
import {
  type FolderPath,
  type FilePath,
  type FileOrFolderPath,
  createFolderPath,
  createFilePath,
  safeDecodeURIComponent,
} from '@utils/path';
import { type NotesRouteParams, routeUrls } from '@utils/routes';
import { useRoute } from 'wouter';

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
export function useDecodedNotesWildcardPath(): string | null {
  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>(
    routeUrls.patterns.NOTES
  );
  if (!isNoteRoute) {
    return null;
  }

  return normalizeWildcardPath(noteParams['*']);
}

/**
 * Hook to get a FilePath object representing the current `/notes/*` route.
 *
 * @returns FilePath object if on a file route, null if not or if invalid.
 */
export function useFilePathFromRoute(): FilePath | null {
  const path = useRecentItemFromRoute();
  return path?.type === 'file' ? path : null;
}

/**
 * Hook to get a FolderPath object representing the current `/notes/*` route.
 *
 * @returns FolderPath object if on a folder route, null if not or if invalid.
 */
export function useFolderPathFromRoute(): FolderPath | null {
  const path = useRecentItemFromRoute();
  return path?.type === 'folder' ? path : null;
}

/**
 * Hook to get the current note or folder represented by the active route.
 *
 * @returns FilePath or FolderPath for the current route, or null if the route
 * does not correspond to a note or folder.
 */
export function useRecentItemFromRoute(): FileOrFolderPath | null {
  const decodedNotesPath = useDecodedNotesWildcardPath();
  const { data: allPaths, isPending } = useAllPaths();

  // Slashless URLs cannot distinguish a dotted folder from a file. Wait for
  // the filesystem snapshot before enabling file queries or recording history.
  if (isPending) return null;

  if (decodedNotesPath) {
    if (allPaths?.includes(`${decodedNotesPath}/`)) {
      return createFolderPath(decodedNotesPath);
    }
    return (
      createFilePath(decodedNotesPath) ?? createFolderPath(decodedNotesPath)
    );
  }

  return null;
}
