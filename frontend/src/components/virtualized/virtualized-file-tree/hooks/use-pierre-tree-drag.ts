import { useEffect, useRef, useState, type RefObject } from 'react';
import type {
  FileTree as PierreFileTree,
  FileTreeDragAndDropConfig,
  FileTreeDropResult,
} from '@pierre/trees';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue, useSetAtom } from 'jotai';
import { draggedGhostElementAtom, isDarkModeOnAtom } from '@/atoms';
import { queryKeys } from '@utils/query-keys';
import {
  buildFileTreeDragPayload,
  createFileTreeDragGhost,
  getRootDropKind,
  restoreSelectionAfterDrag,
} from '../drag';
import { getTreeHost } from '../model-utils';
import { reconcileTreePaths } from '../reconcile';
import { useMoveTreeItemsMutation } from './tree-item-mutations';

type TreeDragSession = {
  draggedPathsRef: RefObject<readonly string[] | null>;
  movePendingRef: RefObject<boolean>;
  onDropCompleteRef: RefObject<((result: FileTreeDropResult) => void) | null>;
  dragAndDrop: FileTreeDragAndDropConfig;
};

// Drag state needed before the pierre model is built. Pierre freezes its
// options at construction, so the drop callback delegates through a ref that
// usePierreTreeDragHandlers keeps current.
export function usePierreTreeDragSession(): TreeDragSession {
  // Set by canDrag (the only pierre hook that runs before startDrag selects the
  // dragged row) and cleared on dragend. While set, selection emissions must
  // not route: the drag-start selection and the post-drop re-selection of a
  // moved item (not yet on disk) would both navigate otherwise.
  const draggedPathsRef = useRef<readonly string[] | null>(null);
  const movePendingRef = useRef(false);
  const onDropCompleteRef = useRef<
    ((result: FileTreeDropResult) => void) | null
  >(null);

  const [dragAndDrop] = useState<FileTreeDragAndDropConfig>(() => ({
    canDrag: (paths) => {
      if (movePendingRef.current) return false;
      draggedPathsRef.current = paths;
      return true;
    },
    canDrop: () => !movePendingRef.current,
    onDropComplete: (result) => onDropCompleteRef.current?.(result),
  }));

  return { draggedPathsRef, movePendingRef, onDropCompleteRef, dragAndDrop };
}

// Moves dropped items on disk and returns the tree wrapper's DOM drag
// handlers: custom drag ghost/payload and drops onto the root.
export function usePierreTreeDragHandlers({
  model,
  session,
  routeTargetPath,
}: {
  model: PierreFileTree;
  session: TreeDragSession;
  routeTargetPath: string | null;
}) {
  const { draggedPathsRef, movePendingRef, onDropCompleteRef } = session;
  const queryClient = useQueryClient();
  const { mutateAsync: moveItems, isPending: isMovePending } =
    useMoveTreeItemsMutation();
  const setDraggedGhostElement = useSetAtom(draggedGhostElementAtom);
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const dragGhostRef = useRef<{ destroy: () => void } | null>(null);

  function moveDraggedItems({
    itemPaths,
    newFolder,
  }: {
    itemPaths: readonly string[];
    newFolder: string;
  }) {
    // The new path isn't on disk yet; useSyncRouteWithRenames moves the
    // route once the watcher reports the rename.
    movePendingRef.current = true;
    void moveItems({
      itemPaths,
      newFolder,
      onError: () => {
        const paths = queryClient.getQueryData<readonly string[]>(
          queryKeys.allPaths()
        );
        if (paths) reconcileTreePaths(model, paths);
        restoreSelectionAfterDrag(model, routeTargetPath);
      },
    })
      .catch(() => {
        // The mutation rolls back and the global QueryError handler reports the failure.
      })
      .finally(() => {
        movePendingRef.current = false;
      });
  }

  useEffect(() => {
    onDropCompleteRef.current = (result) =>
      // A root target (top-level file row) has no directoryPath.
      moveDraggedItems({
        itemPaths: result.draggedPaths,
        newFolder: result.target.directoryPath ?? '',
      });
  });

  function setRootDropHighlight(isActive: boolean) {
    getTreeHost(model)?.toggleAttribute('data-root-drop-target', isActive);
  }

  // Runs after pierre's row handler (preact, own root inside the shadow DOM),
  // so overriding its move-only, raw-path payload here sticks. The editor
  // requests dropEffect 'copy' and parses comma-joined wails URLs.
  function onDragStart(event: React.DragEvent) {
    const paths = draggedPathsRef.current;
    if (!paths || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('text/plain', buildFileTreeDragPayload(paths));
    const ghost = createFileTreeDragGhost({ paths, isDarkModeOn });
    document.body.appendChild(ghost.element);
    event.dataTransfer.setDragImage(ghost.element, 8, 8);
    requestAnimationFrame(() => {
      ghost.element.style.left = '-9999px';
    });
    dragGhostRef.current = ghost;
    setDraggedGhostElement(ghost.element);
  }

  function onDragOver(event: React.DragEvent) {
    if (!draggedPathsRef.current) return;
    setRootDropHighlight(
      !movePendingRef.current &&
        getRootDropKind(event.nativeEvent.composedPath()) !== null
    );
  }

  function onDragLeave(event: React.DragEvent) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setRootDropHighlight(false);
  }

  // Pierre prevents default over blank space but completes no drop there,
  // so the move to the root is issued here.
  function onDrop(event: React.DragEvent) {
    setRootDropHighlight(false);
    const itemPaths = draggedPathsRef.current;
    if (!itemPaths || movePendingRef.current) return;
    if (getRootDropKind(event.nativeEvent.composedPath()) !== 'background') {
      return;
    }
    moveDraggedItems({ itemPaths, newFolder: '' });
  }

  function onDragEnd() {
    setRootDropHighlight(false);
    if (!draggedPathsRef.current) return;
    draggedPathsRef.current = null;
    dragGhostRef.current?.destroy();
    dragGhostRef.current = null;
    setDraggedGhostElement(null);
    restoreSelectionAfterDrag(model, routeTargetPath);
  }

  return {
    isMovePending,
    // Drag events are composed, so they bubble out of pierre's shadow root.
    dragHandlers: { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd },
  };
}
