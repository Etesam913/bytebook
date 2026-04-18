import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';
import {
  activeDropTargetIdAtom,
  dragHighlightIdsAtom,
  fileTreeDataAtom,
} from '../../../../atoms';
import { installWailsDragHandlers } from '../../../../hooks/wails-drag';
import type { FileOrFolder } from '../types';
import { getDragHighlightIds, isTreeNodeAFile } from '../utils/file-tree-utils';

/**
 * Mirrors internal-drag sibling highlighting when an OS-level file drag hovers
 * a file row. Wails intercepts native drags on macOS so DOM `dragover` never
 * fires; this hook wraps the bridged `window._wails` globals via
 * `installWailsDragHandlers` to populate `dragHighlightIdsAtom` /
 * `activeDropTargetIdAtom` the same way the internal drag path does.
 */
export function useExternalFileTreeDrag() {
  const setActiveDropTargetId = useSetAtom(activeDropTargetIdAtom);
  const setDragHighlightIds = useSetAtom(dragHighlightIdsAtom);
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const mapRef = useRef<ReadonlyMap<string, FileOrFolder>>(
    fileTreeData.treeData
  );
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    mapRef.current = fileTreeData.treeData;
  }, [fileTreeData.treeData]);

  useEffect(() => {
    function clear() {
      if (lastIdRef.current === null) return;
      lastIdRef.current = null;
      setActiveDropTargetId(null);
      setDragHighlightIds(new Set());
    }

    function updateForPoint(x: number, y: number) {
      const el = document.elementFromPoint(x, y);
      const dropTarget =
        el?.closest<HTMLElement>('[data-file-drop-target]') ?? null;
      if (!dropTarget || !dropTarget.closest('#file-tree')) {
        clear();
        return;
      }
      const id = dropTarget.id;
      if (id === lastIdRef.current) return;
      const node = mapRef.current.get(id);
      if (!node) return;
      lastIdRef.current = id;
      setActiveDropTargetId(id);
      if (isTreeNodeAFile(node)) {
        setDragHighlightIds(
          getDragHighlightIds({
            fileOrFolderMap: mapRef.current,
            parentId: node.parentId,
          })
        );
      } else {
        // Folders show their own accent via the `.file-drop-target-active` CSS.
        setDragHighlightIds(new Set());
      }
    }

    const cleanup = installWailsDragHandlers({
      onDragOver: updateForPoint,
      onDragLeave: clear,
      onPlatformFileDrop: clear,
    });
    return () => {
      cleanup?.();
    };
  }, [setActiveDropTargetId, setDragHighlightIds]);
}
