import { useMutation } from '@tanstack/react-query';
import {
  getAncestorFolderPathsFromFilePath,
  getTreeNodeFromPath,
  pathExistsInFileTree,
} from '../utils/file-tree-utils';
import { FOLDER_TYPE } from '../types';
import { fileTreeDataAtom } from '../../../../atoms';
import { logger } from '../../../../utils/logging';
import { useSetAtom, useStore } from 'jotai';
import { setFolderOpen, useFetchFolderChildrenMutation } from './open-folder';
import { hasLoadedChildren } from '../utils/file-tree-utils';

const MAX_FOCUS_PAGINATION_ATTEMPTS = 200;

/**
 * Creates a mutation that reveals a route path in the file tree.
 *
 * revealRoutePathAsync('/docs/a/b.md')
 * opens parent folders and paginates until target path is present.
 */
export function useRevealRoutePath() {
  const store = useStore();
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const { mutateAsync: fetchFolderChildrenAsync } =
    useFetchFolderChildrenMutation({
      pageSize: 20000,
    });

  async function revealPathInFileTree(targetPath: string): Promise<boolean> {
    const getFileTreeData = () => store.get(fileTreeDataAtom);

    const ancestorFolderPaths = getAncestorFolderPathsFromFilePath(targetPath);
    if (ancestorFolderPaths.length === 0) {
      return pathExistsInFileTree(getFileTreeData(), targetPath);
    }

    for (
      let folderIndex = 0;
      folderIndex < ancestorFolderPaths.length;
      folderIndex += 1
    ) {
      const ancestorPath = ancestorFolderPaths[folderIndex];
      const nextPathToReveal =
        ancestorFolderPaths[folderIndex + 1] ?? targetPath;

      let ancestorNode = getTreeNodeFromPath(getFileTreeData(), ancestorPath);
      if (!ancestorNode || ancestorNode.type !== FOLDER_TYPE) {
        return false;
      }

      if (!hasLoadedChildren(ancestorNode)) {
        await fetchFolderChildrenAsync({
          pathToFolder: ancestorNode.path,
          folderId: ancestorNode.id,
        });
      }
      // Explicitly open the folder in the sidebar
      setFolderOpen({ setFileTreeData, folderId: ancestorNode.id, isOpen: true });

      let attempts = 0;
      while (attempts < MAX_FOCUS_PAGINATION_ATTEMPTS) {
        ancestorNode = getTreeNodeFromPath(getFileTreeData(), ancestorPath);
        if (!ancestorNode || ancestorNode.type !== FOLDER_TYPE) {
          return false;
        }

        if (pathExistsInFileTree(getFileTreeData(), nextPathToReveal)) {
          break;
        }

        await fetchFolderChildrenAsync({
          pathToFolder: ancestorNode.path,
          folderId: ancestorNode.id,
          isLoadMore: attempts > 0,
        });

        if (!ancestorNode.hasMoreChildren) {
          return false;
        }
        attempts += 1;
      }

      if (!pathExistsInFileTree(getFileTreeData(), nextPathToReveal)) {
        logger.debug(
          'file-tree focus: pagination limit reached before path became visible',
          {
            targetPath,
            ancestorPath,
            attempts: MAX_FOCUS_PAGINATION_ATTEMPTS,
          }
        );
        return false;
      }
    }

    return pathExistsInFileTree(getFileTreeData(), targetPath);
  }

  return useMutation({
    mutationFn: revealPathInFileTree,
  });
}
