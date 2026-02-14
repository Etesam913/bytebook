import { useRoute } from 'wouter';
import {
  FolderPath,
  FilePath,
  createFolderPath,
  createFilePath,
  safeDecodeURIComponent,
} from '../utils/path';
import { NotesRouteParams } from '../utils/routes';

/**
 * Hook to get the decoded wildcard path segment from the `/notes/*` route.
 * The route param is URI-decoded and normalized by removing extra slashes.
 *
 * @returns The normalized path from the route, or null if not on `/notes/*`
 */
function useDecodedNotesWildcardPath(): string | null {
  const [isNoteRoute, noteParams] = useRoute<NotesRouteParams>('/notes/*');
  if (!isNoteRoute || !noteParams['*']) {
    return null;
  }
  return safeDecodeURIComponent(noteParams['*'])
    .split('/')
    .filter(Boolean)
    .join('/');
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
