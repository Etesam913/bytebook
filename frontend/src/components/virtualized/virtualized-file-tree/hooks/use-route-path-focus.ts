import { RefObject, useEffect, useState } from 'react';
import type { ListRange, VirtuosoHandle } from 'react-virtuoso';
import { FILE_TYPE, FOLDER_TYPE, type VirtualizedFileTreeItem } from '../types';
import { fileTreeDataAtom } from '../../../../atoms';
import { useRevealRoutePath } from './use-reveal-route-path';
import { useAtomValue } from 'jotai';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../../hooks/routes';
/**
 * Coordinates route-driven reveal and scrolling behavior for the virtualized tree.
 *
 * @example
 * // Route changes to '/docs/a/b.md':
 * // 1) open ancestor folders (with pagination if needed)
 * // 2) find the row index
 * // 3) scroll until it is visible
 */
export function useRoutePathFocus({
  visibleRange,
  virtualizedData,
  virtuosoRef,
  isSuccess,
}: {
  visibleRange: ListRange;
  virtualizedData: VirtualizedFileTreeItem[];
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  isSuccess: boolean;
}) {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const routeFilePath = useFilePathFromRoute();
  const routeFolderPath = useFolderPathFromRoute();
  const routeTargetPath = routeFilePath?.fullPath ?? routeFolderPath?.fullPath;
  const { mutateAsync: revealRoutePathAsync } = useRevealRoutePath();
  const [pendingScrollPath, setPendingScrollPath] = useState<string | null>(
    null
  );

  useEffect(() => {
    queueMicrotask(() => setPendingScrollPath(null));
  }, [routeTargetPath]);

  // Phase 1: When the route changes, either scroll immediately or
  // reveal the path and set pending scroll for the follow-up effect
  useEffect(() => {
    if (!routeTargetPath || !isSuccess) {
      return;
    }

    const visibleItems = virtualizedData.slice(
      visibleRange.startIndex,
      visibleRange.endIndex
    );

    const isCurrentRouteVisible = visibleItems.some(
      (item) =>
        (item.type === FILE_TYPE || item.type === FOLDER_TYPE) &&
        item.path === routeTargetPath
    );

    // No folder needs to be expanded or revealed if the current route is already visible
    if (isCurrentRouteVisible) {
      return;
    }

    // If the current route is already in virtualizedData, then scroll it into view immediately
    const targetId = fileTreeData.filePathToTreeDataId.get(routeTargetPath);
    if (targetId) {
      const targetItemIndex = virtualizedData.findIndex(
        (item) => item.id === targetId
      );
      if (targetItemIndex !== -1) {
        virtuosoRef.current?.scrollIntoView({
          index: targetItemIndex,
          align: 'center',
        });
        return;
      }
    }

    // Clicking a link to a note or clicking a search result will not reveal the path themselves, so we need to reveal it below
    revealRoutePathAsync(routeTargetPath).then(async (success) => {
      if (success) {
        setPendingScrollPath(routeTargetPath);
        return;
      }
      // await queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
      // const retrySuccess = await revealRoutePathAsync(routeTargetPath);
      // if (retrySuccess) {
      //   setPendingScrollPath(routeTargetPath);
      // }
    });
  }, [routeTargetPath, isSuccess]);

  // Phase 2: Scroll to the revealed path when pendingScrollPath is set.
  // Runs only after a successful reveal, not on every virtualizedData change
  // (e.g. when user closes a folder), so we avoid reopening folders.
  useEffect(() => {
    if (!pendingScrollPath || !routeTargetPath) return;

    const targetId = fileTreeData.filePathToTreeDataId.get(pendingScrollPath);
    if (!targetId) {
      return;
    }

    const targetItemIndex = virtualizedData.findIndex(
      (item) => item.id === targetId
    );
    if (targetItemIndex === -1) {
      return;
    }

    virtuosoRef.current?.scrollIntoView({
      index: targetItemIndex,
      align: 'center',
    });
    queueMicrotask(() => setPendingScrollPath(null));
  }, [pendingScrollPath, routeTargetPath]);
}
