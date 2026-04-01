import { useMutation } from '@tanstack/react-query';
import {
  getAncestorFolderPathsFromFilePath,
  getTreeNodeFromPath,
  pathExistsInFileTree,
  hasLoadedChildren,
} from '../utils/file-tree-utils';
import { isTreeNodeAFolder } from '../utils/file-tree-utils';
import type { FileTreeData } from '../../../../atoms';
import { fileTreeDataAtom } from '../../../../atoms';
import { logger } from '../../../../utils/logging';
import { useSetAtom, useStore } from 'jotai';
import { applyInitialLoad, applyLoadMore } from './open-folder';
import { GetChildrenOfFolderBasedOnPath } from '../../../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';

/**
 * Extracts the last segment (file or folder name) from a path.
 * e.g. "docs/a/b.md" → "b.md", "docs/a" → "a"
 */
function getNameFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

/**
 * Creates a mutation that reveals a route path in the file tree.
 *
 * revealRoutePathAsync('/docs/a/b.md')
 * opens parent folders and fetches children up to the target path.
 */
export function useRevealRoutePath() {
  const store = useStore();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  return useMutation({
    mutationFn: async (targetPath: string): Promise<boolean> => {
      const ancestorFolderPaths =
        getAncestorFolderPathsFromFilePath(targetPath);

      // Build a local working copy so all mutations are batched into one setFileTreeData call
      const currentData = store.get(fileTreeDataAtom);
      const newData: FileTreeData = {
        treeData: new Map(currentData.treeData),
        filePathToTreeDataId: new Map(currentData.filePathToTreeDataId),
      };

      if (ancestorFolderPaths.length === 0) {
        return pathExistsInFileTree(newData, targetPath);
      }

      for (
        let folderIndex = 0;
        folderIndex < ancestorFolderPaths.length;
        folderIndex += 1
      ) {
        const ancestorPath = ancestorFolderPaths[folderIndex];
        const nextPathToReveal =
          ancestorFolderPaths[folderIndex + 1] ?? targetPath;

        const ancestorNode = getTreeNodeFromPath(newData, ancestorPath);
        if (!ancestorNode || !isTreeNodeAFolder(ancestorNode)) {
          return false;
        }

        // If the next path is already visible, just open the folder and continue
        if (
          hasLoadedChildren(ancestorNode) &&
          pathExistsInFileTree(newData, nextPathToReveal)
        ) {
          newData.treeData.set(ancestorNode.id, {
            ...ancestorNode,
            isOpen: true,
          });
          continue;
        }

        // If not visible yet use GetChildrenOfFolderBasedOnPath to fetch children up to the target child
        const endCursor = getNameFromPath(nextPathToReveal);
        const cursor = ancestorNode.childrenCursor ?? '';
        const res = await GetChildrenOfFolderBasedOnPath(
          ancestorNode.path,
          ancestorNode.id,
          cursor,
          endCursor
        );

        if (!res.success || !res.data) {
          logger.debug(
            'file-tree reveal: GetChildrenOfFolderBasedOnPath failed',
            {
              targetPath,
              ancestorPath,
              endCursor,
              message: res.message,
            }
          );
          return false;
        }

        const { items, hasMore, nextCursor } = res.data;
        const isLoadMore = cursor !== '';

        const applyArgs = {
          folderId: ancestorNode.id,
          items,
          hasMore,
          nextCursor,
          maps: newData,
        };

        if (isLoadMore) {
          applyLoadMore(applyArgs);
        } else {
          applyInitialLoad(applyArgs);
        }

        // Mark the folder as open in the working copy
        const updatedNode = newData.treeData.get(ancestorNode.id);
        if (updatedNode && isTreeNodeAFolder(updatedNode)) {
          newData.treeData.set(ancestorNode.id, {
            ...updatedNode,
            isOpen: true,
          });
        }

        if (!pathExistsInFileTree(newData, nextPathToReveal)) {
          logger.debug(
            'file-tree reveal: path not visible after fetching children',
            {
              targetPath,
              ancestorPath,
              endCursor,
            }
          );
          return false;
        }
      }

      // Single batched state update
      setFileTreeData(newData);
      return pathExistsInFileTree(newData, targetPath);
    },
  });
}
