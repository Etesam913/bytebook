import { RefObject, useEffect, useState } from 'react';
import type { ListRange, VirtuosoHandle } from 'react-virtuoso';
import { FILE_TYPE, FOLDER_TYPE, type VirtualizedFileTreeItem } from '../types';
import { fileTreeDataAtom } from '../../../../atoms';
import { useRevealRoutePath } from './use-reveal-route-path';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
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
}: {
  visibleRange: ListRange;
  virtualizedData: VirtualizedFileTreeItem[];
  virtuosoRef: RefObject<VirtuosoHandle | null>;
}) {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const hasFileTreeData = fileTreeData.treeData.size > 0;
  const routeFilePath = useFilePathFromRoute();
  const routeFolderPath = useFolderPathFromRoute();
  const routeTargetPath = routeFilePath?.fullPath ?? routeFolderPath?.fullPath;
  const { mutateAsync: revealRoutePathAsync } = useRevealRoutePath();
  const queryClient = useQueryClient();
  const [pendingScrollPath, setPendingScrollPath] = useState<string | null>(
    null
  );

  useEffect(() => {
    queueMicrotask(() => setPendingScrollPath(null));
  }, [routeTargetPath]);

  // Phase 1: When the route changes, either scroll immediately or
  // reveal the path and set pending scroll for the follow-up effect
  useEffect(() => {
    if (!routeTargetPath || !hasFileTreeData) {
      console.log('[useRoutePathFocus] phase1: skipping — no routeTargetPath or fileTreeData not loaded', { routeTargetPath, hasFileTreeData });
      return;
    }

    console.log('[useRoutePathFocus] phase1: route changed to', routeTargetPath);

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
      console.log('[useRoutePathFocus] phase1: target already visible, no action needed');
      return;
    }

    // If the current route is already in virtualizedData, then scroll it into view immediately
    const targetId = fileTreeData.filePathToTreeDataId.get(routeTargetPath);
    if (targetId) {
      const targetItemIndex = virtualizedData.findIndex(
        (item) => item.id === targetId
      );
      if (targetItemIndex !== -1) {
        console.log('[useRoutePathFocus] phase1: target in virtualizedData, scrolling to index', targetItemIndex);
        virtuosoRef.current?.scrollIntoView({
          index: targetItemIndex,
          align: 'center',
        });
        return;
      }
    }

    // Clicking a link to a note or clicking a search result will not reveal the path themselves, so we need to reveal it below
    console.log('[useRoutePathFocus] phase1: revealing path', routeTargetPath);
    revealRoutePathAsync(routeTargetPath).then(async (success) => {
      if (success) {
        console.log('[useRoutePathFocus] phase1: reveal succeeded, setting pendingScrollPath');
        setPendingScrollPath(routeTargetPath);
        return;
      }

      console.log('[useRoutePathFocus] phase1: reveal failed, invalidating top-level-files and retrying');
      await queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
      const retrySuccess = await revealRoutePathAsync(routeTargetPath);
      if (retrySuccess) {
        console.log('[useRoutePathFocus] phase1: retry reveal succeeded, setting pendingScrollPath');
        setPendingScrollPath(routeTargetPath);
      } else {
        console.log('[useRoutePathFocus] phase1: retry reveal failed');
      }
    });
  }, [routeTargetPath, hasFileTreeData]);

  // Phase 2: Scroll to the revealed path when pendingScrollPath is set.
  // Runs only after a successful reveal, not on every virtualizedData change
  // (e.g. when user closes a folder), so we avoid reopening folders.
  useEffect(() => {
    if (!pendingScrollPath || !routeTargetPath) return;

    console.log('[useRoutePathFocus] phase2: attempting scroll for pendingScrollPath', pendingScrollPath);

    const targetId = fileTreeData.filePathToTreeDataId.get(pendingScrollPath);
    if (!targetId) {
      console.log('[useRoutePathFocus] phase2: no targetId found for path, waiting for next render');
      return;
    }

    const targetItemIndex = virtualizedData.findIndex(
      (item) => item.id === targetId
    );
    if (targetItemIndex === -1) {
      console.log('[useRoutePathFocus] phase2: targetId not in virtualizedData yet, waiting for next render');
      return;
    }

    console.log('[useRoutePathFocus] phase2: scrolling to index', targetItemIndex);
    virtuosoRef.current?.scrollIntoView({
      index: targetItemIndex,
      align: 'center',
    });
    queueMicrotask(() => setPendingScrollPath(null));
  }, [pendingScrollPath, routeTargetPath]);
}
