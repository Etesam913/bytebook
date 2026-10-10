import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { useLocation, useSearchParams } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import { isFileMaximizedAtom, mostRecentItemsAtom } from '@/atoms';
import { useWailsEvent } from './events';
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
  createFolderPath,
  createFilePath,
  remapPathThroughRenames,
  type PathRename,
  stripTrailingSlash,
} from '@utils/path';
import {
  getNavigationTargetForDeletedPaths,
  navigateToPath,
} from '@utils/routes';
import { queryKeys } from '@utils/query-keys';
import {
  useDecodedNotesWildcardPath,
  useFilePathFromRoute,
  useFolderPathFromRoute,
  useRecentItemFromRoute,
} from './routes';

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

export function useRecordRecentItem() {
  const routeItem = useRecentItemFromRoute();
  const setMostRecentItems = useSetAtom(mostRecentItemsAtom);
  // Update the "most recent items" list in the sidebar based on current route.
  // Inserts the currently viewed item at the top, maintaining list uniqueness and max length.
  useEffect(() => {
    if (!routeItem) {
      return;
    }
    setMostRecentItems((prev) => {
      const next = [
        routeItem,
        ...prev.filter((path) => path.fullPath !== routeItem.fullPath),
      ].slice(0, 10);

      const didOrderChange =
        next.length !== prev.length ||
        next.some((item, index) => item.fullPath !== prev[index]?.fullPath);

      return didOrderChange ? next : prev;
    });
  }, [routeItem, setMostRecentItems]);
}
