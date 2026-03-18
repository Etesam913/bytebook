import { useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { FileTreeData, fileTreeDataAtom } from '../../../../atoms';
import { WailsEvent, useWailsEvent } from '../../../../hooks/events';
import { logger } from '../../../../utils/logging';
import { getParentNodeFromPath, removeSubtree } from '../utils/file-tree-utils';
import {
  useCurrentNotesRouteFolderPath,
  useFilePathFromRoute,
} from '../../../../hooks/routes';
import { createFolderPath } from '../../../../utils/path';

function normalizeFolderPath(path: string): string | null {
  return createFolderPath(path)?.fullPath ?? null;
}

function isPrefixOrSamePath(path: string, maybePrefix: string): boolean {
  return path === maybePrefix || path.startsWith(`${maybePrefix}/`);
}

function isPathDeleted(path: string, deletedFolderPaths: string[]): boolean {
  return deletedFolderPaths.some((deletedPath) =>
    isPrefixOrSamePath(path, deletedPath)
  );
}

function getClosestSurvivingAncestorFolderPath(
  currentFolderPath: string,
  deletedFolderPaths: string[]
): string | null {
  const segments = currentFolderPath.split('/').filter(Boolean);

  for (let depth = segments.length - 1; depth >= 1; depth -= 1) {
    const candidatePath = segments.slice(0, depth).join('/');
    if (!isPathDeleted(candidatePath, deletedFolderPaths)) {
      return candidatePath;
    }
  }

  return null;
}

/**
 * Returns parent childrenIds after removing the deleted file node.
 */
function getChildrenIdsWithoutDeletedNode(
  fileTreeData: FileTreeData,
  deletedNodePath: string
): string[] {
  const deletedNodeId = fileTreeData.filePathToTreeDataId.get(deletedNodePath);
  const parentNode = getParentNodeFromPath(fileTreeData, deletedNodePath);
  if (!deletedNodeId || !parentNode || parentNode.type !== 'folder') {
    return [];
  }

  return parentNode.childrenIds.filter((id) => id !== deletedNodeId);
}

/**
 * Handles both `note:delete` and `folder:delete` Wails events.
 */
export function useDeleteEvents() {
  const queryClient = useQueryClient();
  const [fileTreeData, setFileTreeData] = useAtom(fileTreeDataAtom);
  const currentRouteFilePath = useFilePathFromRoute();
  const currentRouteFolderPath = useCurrentNotesRouteFolderPath();

  function handleDelete(
    eventName: 'note:delete' | 'folder:delete',
    body: WailsEvent
  ) {
    logger.event(eventName, body);
    const rawData = body.data as Array<Record<string, string>>;
    let needsTopLevelInvalidation = false;

    setFileTreeData((prev) => {
      const updatedTreeData = new Map(prev.treeData);
      const updatedFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);

      for (const item of rawData) {
        const path =
          eventName === 'note:delete'
            ? (item as { notePath: string }).notePath
            : (item as { folderPath: string }).folderPath;

        const segments = path.split('/').filter(Boolean);

        if (segments.length === 1) {
          needsTopLevelInvalidation = true;
          continue;
        }

        const parentNode = getParentNodeFromPath(fileTreeData, path);
        const fileId = fileTreeData.filePathToTreeDataId.get(path);

        if (!fileId || !parentNode) {
          needsTopLevelInvalidation = true;
          continue;
        }

        // Exclude the deleted node from the parent's childrenIds
        updatedTreeData.set(parentNode.id, {
          ...parentNode,
          childrenIds: getChildrenIdsWithoutDeletedNode(fileTreeData, path),
        });
        removeSubtree(fileTreeData, fileId);
      }

      return {
        treeData: updatedTreeData,
        filePathToTreeDataId: updatedFilePathToTreeDataId,
      };
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }
  }

  useWailsEvent('note:delete', async (body) => {
    logger.event('note:delete', body);
    // const data = body.data as { notePath: string }[];
    // const didDeleteCurrentRouteFile = currentRouteFilePath
    //   ? data.some(({ notePath }) => notePath === currentRouteFilePath.fullPath)
    //   : false;
    // let closestFileToDeletedFromPrev: FileOrFolder | null = null;

    handleDelete('note:delete', body);

    // if (didDeleteCurrentRouteFile && currentRouteFilePath) {
    //   const closestFileToDeleted = closestFileToDeletedFromPrev;
    //   if (closestFileToDeleted) {
    //     const closestFilePath = createFilePath(closestFileToDeleted.path);
    //     if (closestFilePath) {
    //       navigate(closestFilePath.encodedFileUrl);
    //       return;
    //     }
    //   }

    //   const parentFolderPath = createFolderPath(currentRouteFilePath.folder);
    //   if (parentFolderPath) {
    //     navigate(parentFolderPath.encodedFolderUrl);
    //   } else {
    //     navigate(routeUrls.notFoundFallback());
    //   }
    // }
  });

  useWailsEvent('folder:delete', async (body) => {
    logger.event('folder:delete', body);
    // const data = body.data as { folderPath: string }[];

    handleDelete('folder:delete', body);

    // if (!currentRouteFolderPath) {
    //   return;
    // }

    // const normalizedDeletedFolderPaths = data
    //   .map(({ folderPath }) => normalizeFolderPath(folderPath))
    //   .filter((path): path is string => path !== null);
    // const routeFolderPath = currentRouteFolderPath.fullPath;
    // const isRouteInDeletedFolder = normalizedDeletedFolderPaths.some(
    //   (deletedFolderPath) =>
    //     isPrefixOrSamePath(routeFolderPath, deletedFolderPath)
    // );

    // if (!isRouteInDeletedFolder) {
    //   return;
    // }

    // const fallbackFolderPath = getClosestSurvivingAncestorFolderPath(
    //   routeFolderPath,
    //   normalizedDeletedFolderPaths
    // );
    // const fallbackFolder = fallbackFolderPath
    //   ? createFolderPath(fallbackFolderPath)
    //   : null;

    // navigate(
    //   fallbackFolder
    //     ? fallbackFolder.encodedFolderUrl
    //     : routeUrls.notFoundFallback()
    // );
  });
}
