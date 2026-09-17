import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { useLocation, useRoute, useSearchParams } from 'wouter';
import { isFileMaximizedAtom, mostRecentItemsAtom } from '@/atoms';
import { useWailsEvent } from './events';
import { useAllPaths } from './all-paths';
import {
  FILE_DELETE,
  FOLDER_DELETE,
  FILE_RENAME,
  FOLDER_RENAME,
  isEventInCurrentWindow,
  NAVIGATE_BACK,
  NAVIGATE_FORWARD,
} from '@utils/events';
import {
  type FolderPath,
  type FilePath,
  type FileOrFolderPath,
  createFolderPath,
  createFilePath,
  remapPathThroughRenames,
  type PathRename,
  safeDecodeURIComponent,
  stripTrailingSlash,
} from '@utils/path';
import {
  type NotesRouteParams,
  getNavigationTargetForDeletedPaths,
  navigateToPath,
  routeUrls,
} from '@utils/routes';
import { queryKeys } from '@utils/query-keys';

function normalizeWildcardPath(path: string | undefined): string | null {
  if (!path) {
    return null;
  }

  return safeDecodeURIComponent(path).split('/').filter(Boolean).join('/');
}

/** Handles native back and forward navigation events for the current window. */
export function useHistoryNavigationEvents(): void {
  useWailsEvent(NAVIGATE_BACK, (event) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(event))) return;
      window.history.back();
    })();
  });

  useWailsEvent(NAVIGATE_FORWARD, (event) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(event))) return;
      window.history.forward();
    })();
  });
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

/**
 * Keep routes without sidebar context from showing the file sidebar. The root
 * route has no main content, so it always opens the sidebar.
 */
export function useSyncFileMaximizedWithRoute(): void {
  const [pathname] = useLocation();
  const isFileMaximized = useAtomValue(isFileMaximizedAtom);
  const setIsFileMaximized = useSetAtom(isFileMaximizedAtom);

  useEffect(() => {
    if (pathname === '/') {
      setIsFileMaximized(false);
      return;
    }

    const isKernelRoute = pathname.startsWith('/kernels');
    if (isKernelRoute && isFileMaximized) {
      setIsFileMaximized(false);
    }
  }, [isFileMaximized, pathname, setIsFileMaximized]);
}

/**
 * Keeps the `/notes/*` route pointing at the on-disk path when the current
 * note or one of its ancestor folders is renamed — whether through the inline
 * tree rename or an external tool like Finder. Renames only reach the route
 * through this hook; nothing else navigates on a rename.
 */
export function useSyncRouteWithRenames(): void {
  const queryClient = useQueryClient();
  const filePath = useFilePathFromRoute();
  const folderPath = useFolderPathFromRoute();

  const navigateIfCurrentPathRenamed = ({
    renames,
    isFolder,
  }: {
    renames: readonly PathRename[];
    isFolder: boolean;
  }) => {
    const currentPath = filePath?.fullPath ?? folderPath?.fullPath;
    if (!currentPath) return;
    const remapped = remapPathThroughRenames({
      path: currentPath,
      renames,
      isFolder,
    });
    if (!remapped) return;
    const target = filePath
      ? createFilePath(remapped)
      : createFolderPath(remapped);
    if (!target) return;

    // Hand the active note's known existence result to its new query key so
    // route replacement does not briefly swap the editor for a loading state.
    if (filePath) {
      const exists = queryClient.getQueryData<boolean>(
        queryKeys.doesNoteExist(currentPath)
      );
      if (exists !== undefined) {
        queryClient.setQueryData(queryKeys.doesNoteExist(remapped), exists);
      }
    }
    navigateToPath(target, { replace: true });
  };

  useWailsEvent(FOLDER_RENAME, (event) => {
    const rawData =
      (event.data as Array<{
        oldFolderPath: string;
        newFolderPath: string;
      }>) ?? [];
    navigateIfCurrentPathRenamed({
      renames: rawData.map((item) => ({
        oldPath: item.oldFolderPath,
        newPath: item.newFolderPath,
      })),
      isFolder: true,
    });
  });

  useWailsEvent(FILE_RENAME, (event) => {
    const rawData =
      (event.data as Array<{ oldFilePath: string; newFilePath: string }>) ?? [];
    navigateIfCurrentPathRenamed({
      renames: rawData.map((item) => ({
        oldPath: item.oldFilePath,
        newPath: item.newFilePath,
      })),
      isFolder: false,
    });
  });
}

/**
 * On app launch, Go opens the initial window at `/?restore`. When this flag
 * is present, navigate to the most recently visited note/folder (tracked in
 * localStorage via `mostRecentItemsAtom`). Manually opened new windows ("New
 * Window" menu, cmd+shift+n) launch at `/` without the flag and stay at root.
 */
export function useRestoreLastVisitedOnLaunch(): void {
  const mostRecentItems = useAtomValue(mostRecentItemsAtom);
  const [, navigate] = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!searchParams.has('restore')) {
      return;
    }
    const target = mostRecentItems[0];
    const url =
      target?.type === 'folder'
        ? target.encodedFolderUrl
        : target?.encodedFileUrl;
    navigate(url ?? '/', { replace: true });
    // Intentionally run once on mount — `mostRecentItems` is initialized
    // synchronously from localStorage, so the first render has the value.
  }, []);
}

// External deletions bypass the trash mutation, so every window handles them here.
export function useSyncRouteWithDeletions(): void {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const currentRoutePath = useDecodedNotesWildcardPath();

  const handleDeletion = ({
    paths,
    includeDescendants,
  }: {
    paths: string[];
    includeDescendants: boolean;
  }) => {
    const normalizedPaths = paths.map(stripTrailingSlash).filter(Boolean);
    const target = getNavigationTargetForDeletedPaths({
      currentRoutePath,
      paths: normalizedPaths,
      includeDescendants,
    });
    if (target !== null) navigate(target, { replace: true });

    // Invalidate inactive entries too, so history navigation rechecks disk.
    // Navigation unmounts the editor; avoid a competing active-query 404 redirect.
    void queryClient.invalidateQueries({
      queryKey: queryKeys.doesNoteExistAll(),
      predicate: ({ queryKey }) => {
        const path = queryKey[1];
        return (
          typeof path === 'string' &&
          normalizedPaths.some(
            (deletedPath) =>
              path === deletedPath ||
              (includeDescendants && path.startsWith(deletedPath + '/'))
          )
        );
      },
      refetchType: 'none',
    });
  };

  useWailsEvent(FILE_DELETE, (event) => {
    handleDeletion({
      paths: event.data.map((item) => item.filePath),
      includeDescendants: false,
    });
  });
  useWailsEvent(FOLDER_DELETE, (event) => {
    handleDeletion({
      paths: event.data.map((item) => item.folderPath),
      includeDescendants: true,
    });
  });
}
