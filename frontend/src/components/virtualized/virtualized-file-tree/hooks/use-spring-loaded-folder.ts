import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { fileTreeDataAtom } from '../../../../atoms';
import { setFolderOpen } from './open-folder';
import { hasLoadedChildren } from '../utils/file-tree-utils';
import type { Folder } from '../types';
import type { FetchFolderChildrenArgs } from '../file-tree-item/folder/hooks';
import { useFolderOpenAnimationActions } from './use-folder-open-animation';

// Implements spring-loaded folder behavior during drag-and-drop. When dragging over a
// closed folder, starts a 600ms timer to auto-expand it and fetch children if needed.
// Returns `triggerSpringLoad` to start the timer and `cancelSpringLoad` to clear it.
export function useSpringLoadedFolder({
  dataItem,
  fetchFolderChildren,
}: {
  dataItem: Folder;
  fetchFolderChildren: (args: FetchFolderChildrenArgs) => void;
}) {
  const setFileTreeData = useSetAtom(fileTreeDataAtom);
  const dragOverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { triggerFolderOpenAnimation } = useFolderOpenAnimationActions();

  useEffect(() => {
    // Handle cleanup to ensure there are no stale timeouts if the component unmounts while a timer is active.
    return () => {
      if (dragOverTimeoutRef.current) {
        clearTimeout(dragOverTimeoutRef.current);
      }
    };
  }, []);

  // Starts the spring-load timer if the folder is closed and no timer is already running.
  // After 600ms, opens the folder and fetches children if they haven't been loaded yet.
  const triggerSpringLoad = () => {
    if (!dataItem.isOpen && !dragOverTimeoutRef.current) {
      dragOverTimeoutRef.current = setTimeout(() => {
        // triggerFolderOpenAnimation(dataItem.id);
        setFolderOpen({
          setFileTreeData,
          folderId: dataItem.id,
          isOpen: true,
        });
        if (!hasLoadedChildren(dataItem)) {
          fetchFolderChildren({
            pathToFolder: dataItem.path,
            folderId: dataItem.id,
          });
        }
        dragOverTimeoutRef.current = null;
      }, 600);
    }
  };

  // Clears the pending spring-load timer, preventing the folder from auto-expanding.
  const cancelSpringLoad = () => {
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current);
      dragOverTimeoutRef.current = null;
    }
  };

  return {
    triggerSpringLoad,
    cancelSpringLoad,
  };
}
