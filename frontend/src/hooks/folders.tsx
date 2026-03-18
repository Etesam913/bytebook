import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logging';
import { useAtom, useSetAtom } from 'jotai';
import { fileTreeDataAtom } from '../atoms';
import { removeFolderFromFileTreeMap } from '../components/virtualized/virtualized-file-tree/utils/file-tree-utils';
import {
  applyNodeUpdates,
  applyParentFolderUpdates,
  applyPathRemappings,
  buildRenameUpdates,
} from '../components/virtualized/virtualized-file-tree/utils/rename-item';
import { useWailsEvent } from './events';
import { navigate } from 'wouter/use-browser-location';
import { createFilePath, createFolderPath } from '../utils/path';
import { routeUrls } from '../utils/routes';
import { useFilePathFromRoute, useCurrentNotesRouteFolderPath } from './routes';
function normalizeFolderPath(path: string): string | null {
  return createFolderPath(path)?.fullPath ?? null;
}

function isPrefixOrSamePath(path: string, maybePrefix: string): boolean {
  return path === maybePrefix || path.startsWith(`${maybePrefix}/`);
}

/** This function is used to handle `folder:delete` events. This gets triggered when deleting a folder using the file system */
export function useFolderDelete() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const currentRouteFolderPath = useCurrentNotesRouteFolderPath();

  useWailsEvent('folder:delete', async (body) => {
    logger.event('folder:delete', body);
    const data = body.data as { folderPath: string }[];

    let needsTopLevelInvalidation = false;

    setFileTreeData((prev) => {
      let updatedFileTreeData = prev;
      let didUpdate = false;

      for (const { folderPath } of data) {
        const segments = folderPath.split('/').filter(Boolean);

        if (segments.length === 1) {
          // Top-level folder - just invalidate the query
          needsTopLevelInvalidation = true;
          continue;
        }

        // Nested folder - remove it from the map
        const parentPath = segments.slice(0, -1).join('/');

        // Look up ids from paths
        const folderId =
          updatedFileTreeData.filePathToTreeDataId.get(folderPath);
        const parentId =
          updatedFileTreeData.filePathToTreeDataId.get(parentPath);

        if (!folderId || !parentId) {
          // Can't find folder in path map - invalidate queries
          needsTopLevelInvalidation = true;
          continue;
        }

        updatedFileTreeData = removeFolderFromFileTreeMap({
          fileTreeData: updatedFileTreeData,
          folderId,
          parentId,
        });
        didUpdate = true;
      }

      return didUpdate ? updatedFileTreeData : prev;
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

    // If one of the deleted folders is a parent of the current route folder, navigate to the not found page
    const shouldNavigateToNotFound = currentRouteFolderPath
      ? data.some(({ folderPath }) => {
          const normalizedDeletedFolderPath = normalizeFolderPath(folderPath);
          if (!normalizedDeletedFolderPath) {
            return false;
          }
          return isPrefixOrSamePath(
            currentRouteFolderPath.fullPath,
            normalizedDeletedFolderPath
          );
        })
      : false;

    if (shouldNavigateToNotFound) {
      navigate(routeUrls.notFoundFallback());
    }
  });
}

/** This function is used to handle `folder:rename` events. This gets triggered when renaming a folder using the file system */
export function useFolderRename() {
  const queryClient = useQueryClient();
  const [{ filePathToTreeDataId, treeData }, setFileTreeData] =
    useAtom(fileTreeDataAtom);
  const currentRouteFolderPath = useCurrentNotesRouteFolderPath();
  const currentRouteFilePath = useFilePathFromRoute();

  useWailsEvent('folder:rename', async (body) => {
    logger.event('folder:rename', body);
    const data = body.data as {
      oldFolderPath: string;
      newFolderPath: string;
    }[];

    const {
      needsTopLevelInvalidation,
      pathRemappings,
      nodeUpdates,
      parentFolderUpdates,
    } = await buildRenameUpdates({
      entries: data.map(({ oldFolderPath, newFolderPath }) => ({
        oldPath: oldFolderPath,
        newPath: newFolderPath,
      })),
      fileTreeData: { filePathToTreeDataId, treeData },
      isValidNode: (node) => node.type === 'folder',
      onMissingNode: (oldPath) => {
        logger.error('folder:rename', 'id for old folder path not found', {
          oldFolderPath: oldPath,
        });
      },
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }

    // Apply all changes in a single setFileTreeData call
    if (pathRemappings.size > 0) {
      setFileTreeData((prev) => {
        const remappedTreeData = applyPathRemappings({
          fileTreeData: prev,
          pathRemappings,
          mode: 'folder',
        });
        let updatedTreeData = applyNodeUpdates({
          treeData: remappedTreeData.treeData,
          nodeUpdates,
          expectedType: 'folder',
        });
        updatedTreeData = applyParentFolderUpdates({
          treeData: updatedTreeData,
          parentFolderUpdates,
        });

        return {
          treeData: updatedTreeData,
          filePathToTreeDataId: remappedTreeData.filePathToTreeDataId,
        };
      });
    }

    // If the current note's parent folder is getting renamed, we want to redirect to the new folder path
    const matchedRename = currentRouteFolderPath
      ? data.find(({ oldFolderPath }) => {
          const normalizedOldFolderPath = normalizeFolderPath(oldFolderPath);
          if (!normalizedOldFolderPath) {
            return false;
          }
          return isPrefixOrSamePath(
            currentRouteFolderPath.fullPath,
            normalizedOldFolderPath
          );
        })
      : undefined;

    // Example: If a user is viewing "/notes/old-folder/sub/NoteA" and "old-folder" is renamed to "new-folder",
    // this will redirect to "/notes/new-folder/sub/NoteA" to maintain correct navigation.
    if (matchedRename && currentRouteFolderPath) {
      const normalizedOldFolderPath = normalizeFolderPath(
        matchedRename.oldFolderPath
      );
      const normalizedNewFolderPath = normalizeFolderPath(
        matchedRename.newFolderPath
      );
      if (!normalizedOldFolderPath || !normalizedNewFolderPath) {
        navigate(routeUrls.notFoundFallback());
        return;
      }

      // Suffix preserves the subfolder/note route after the renamed folder
      const suffix = currentRouteFolderPath.fullPath.slice(
        normalizedOldFolderPath.length
      );
      const nextFolderPath = `${normalizedNewFolderPath}${suffix}`;

      if (currentRouteFilePath) {
        const newFilePath = createFilePath(
          `${nextFolderPath}/${currentRouteFilePath.note}`
        );
        navigate(
          newFilePath
            ? newFilePath.encodedFileUrl
            : routeUrls.notFoundFallback()
        );
        return;
      }

      const newFolderPath = createFolderPath(nextFolderPath);
      navigate(
        newFolderPath
          ? newFolderPath.encodedFolderUrl
          : routeUrls.notFoundFallback()
      );
    }
  });
}
