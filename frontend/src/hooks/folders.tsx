import {
  queryOptions,
  useQuery,
  useQueryClient,
  QueryClient,
} from '@tanstack/react-query';
import { logger } from '../utils/logging';
import { useAtom, useSetAtom } from 'jotai';
import { GetFolders } from '../../bindings/github.com/etesam913/bytebook/internal/services/folderservice';
import { fileTreeDataAtom } from '../components/virtualized/virtualized-file-tree';
import {
  addFolderToFileTreeMap,
  removeFolderFromFileTreeMap,
} from '../components/virtualized/virtualized-file-tree/utils/file-tree-utils';
import {
  applyNodeUpdates,
  applyParentFolderUpdates,
  applyPathRemappings,
  buildRenameUpdates,
} from '../components/virtualized/virtualized-file-tree/utils/rename-item';
import { QueryError } from '../utils/query';
import { useWailsEvent } from './events';
import { OpenFolderAndAddToFileWatcher } from '../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';

type FoldersQueryData = {
  alphabetizedFolders: string[];
  previousAlphabetizedFolders: string[] | undefined;
};

export const folderQueries = {
  getFolders: (queryClient: QueryClient) =>
    queryOptions({
      queryKey: ['folders'],
      queryFn: async () => {
        const res = await GetFolders();
        if (!res.success) {
          throw new QueryError(res.message);
        }
        const previousQueryData = queryClient.getQueryData<FoldersQueryData>([
          'folders',
        ]);
        const previousFolders = previousQueryData?.alphabetizedFolders;
        return {
          alphabetizedFolders: (res.data ?? []).sort((a, b) =>
            a.localeCompare(b)
          ),
          previousAlphabetizedFolders: previousFolders || undefined,
        };
      },
    }),
};

/**
 * Custom hook to fetch and manage folders.
 *
 * @param curFolder - The current folder name from the URL.
 * @returns An object containing the query data and alphabetized folders.
 */
export function useFolders() {
  const queryClient = useQueryClient();
  return useQuery(folderQueries.getFolders(queryClient));
}

/** This function is used to handle `folder:create` events */
export function useFolderCreate() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

  useWailsEvent('folder:create', async (body) => {
    logger.event('folder:create', body);
    const data = body.data as { folderPath: string }[];
    let needsTopLevelInvalidation = false;

    setFileTreeData((prev) => {
      let updatedTreeData = new Map(prev.treeData);
      const updatedFilePathToTreeDataId = new Map(prev.filePathToTreeDataId);

      for (const { folderPath } of data) {
        // Skip if folder path already exists in the filepath-to-id mapping
        if (updatedFilePathToTreeDataId.has(folderPath)) {
          continue;
        }

        const segments = folderPath.split('/').filter(Boolean);

        if (segments.length === 1) {
          // Top-level folder - just invalidate the query
          needsTopLevelInvalidation = true;
          continue;
        }

        const folderName = segments[segments.length - 1];
        const parentPath = segments.slice(0, -1).join('/');
        const parentId = updatedFilePathToTreeDataId.get(parentPath);

        if (!parentId) {
          // The folder is top level as it does not have a parent
          needsTopLevelInvalidation = true;
          continue;
        }

        const parent = updatedTreeData.get(parentId);

        if (!parent || parent.type !== 'folder' || !parent.isOpen) {
          // Parent can't be closed
          continue;
        }

        // Generate a new UUID for this folder
        const newFolderId = crypto.randomUUID();
        updatedFilePathToTreeDataId.set(folderPath, newFolderId);
        updatedTreeData = addFolderToFileTreeMap({
          map: updatedTreeData,
          folderId: newFolderId,
          folderPath,
          folderName,
          parentId,
        });
      }

      return {
        treeData: updatedTreeData,
        filePathToTreeDataId: updatedFilePathToTreeDataId,
      };
    });

    if (needsTopLevelInvalidation) {
      queryClient.invalidateQueries({ queryKey: ['top-level-files'] });
    }
  });
}

/** This function is used to handle `folder:delete` events. This gets triggered when deleting a folder using the file system */
export function useFolderDelete() {
  const queryClient = useQueryClient();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);

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
  });
}

/** This function is used to handle `folder:rename` events. This gets triggered when renaming a folder using the file system */
export function useFolderRename() {
  const queryClient = useQueryClient();
  const [{ filePathToTreeDataId, treeData }, setFileTreeData] =
    useAtom(fileTreeDataAtom);

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
      onBeforeUpdate: async (node, newPath) => {
        if (node.type === 'folder' && node.isOpen) {
          // Ensure watcher listens to the new path when the folder is open.
          await OpenFolderAndAddToFileWatcher(newPath);
        }
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
  });
}
