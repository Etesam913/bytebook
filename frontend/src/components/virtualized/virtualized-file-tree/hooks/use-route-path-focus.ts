import { RefObject, useEffect, useRef, useState } from 'react';
import type { ListRange, VirtuosoHandle } from 'react-virtuoso';
import { FILE_TYPE, FOLDER_TYPE, type VirtualizedFileTreeItem } from '../types';
import { fileTreeDataAtom } from '..';
import { useRevealRoutePath } from './use-reveal-route-path';
import { useAtomValue, useStore } from 'jotai';
import { useFilePathFromRoute } from '../../../../hooks/routes';

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
  visibleElementsRef,
  virtualizedData,
  virtuosoRef,
}: {
  visibleElementsRef: RefObject<ListRange>;
  virtualizedData: VirtualizedFileTreeItem[];
  virtuosoRef: RefObject<VirtuosoHandle | null>;
}) {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const hasFileTreeData = fileTreeData.treeData.size > 0;
  const routeFilePath = useFilePathFromRoute();
  const { mutateAsync: revealRoutePathAsync } = useRevealRoutePath();

  // Phase 1: When the route changes, either scroll immediately or
  // await the full reveal before attempting to scroll
  useEffect(() => {
    if (!routeFilePath || !hasFileTreeData) {
      return;
    }
    console.log('naurs');
    const visibleItems = virtualizedData.slice(
      visibleElementsRef.current.startIndex,
      visibleElementsRef.current.endIndex
    );

    const isCurrentRouteVisible = visibleItems.some(
      (item) =>
        (item.type === FILE_TYPE || item.type === FOLDER_TYPE) &&
        item.path === routeFilePath.fullPath
    );

    // No folder needs to be expanded or revealed if the current route is already visible
    if (isCurrentRouteVisible) {
      return;
    }

    // If the current route is already in virtualizedData, scroll it into view immediately
    const targetId = fileTreeData.filePathToTreeDataId.get(
      routeFilePath.fullPath
    );
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
    revealRoutePathAsync(routeFilePath!.fullPath);
  }, [routeFilePath, hasFileTreeData]);
}
