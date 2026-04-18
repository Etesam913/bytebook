import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { calculateZoomLevel, mergeRegister } from '@lexical/utils';
import type { MotionValue } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  type LexicalEditor,
  isHTMLElement,
} from 'lexical';
import { type RefObject, useEffect } from 'react';
import { draggableBlockElementAtom, draggedGhostElementAtom } from '../atoms';
import { useWailsEvent, type WailsEvent } from '../../../hooks/events';
import { EDITOR_CONTENT_DROP } from '../../../utils/events';
import { createFilePath, type FilePath } from '../../../utils/path';
import { throttle } from '../../../utils/draggable';
import { useAddDroppedFilesToFolderMutation } from '../../virtualized/virtualized-file-tree/hooks/tree-item-mutations';
import type { FilePayload } from '../nodes/file';
import { INSERT_FILES_COMMAND } from '../plugins/file';
import {
  dispatchDragOver,
  dispatchDrop,
  externalFiles,
  getBlockElement,
  isOnHandle,
  setTargetLine,
  type DragAndDropCaretMotionValues,
  type DragContext,
} from '../utils/drag';
import { setSelectionFromPointerInNoteEditor } from '../utils/note-commands';
import { FILE_TREE_GHOST_ID } from '../../virtualized/virtualized-file-tree/utils/drag';
import { installWailsDragHandlers } from '../../../hooks/wails-drag';

/** Prefix stripped from paths returned by `addDroppedFilesToFolder`. */
const NOTES_PREFIX = 'notes/';

type EditorContentDropEventData = {
  droppedFiles?: string[];
  targetElementId?: string;
  x?: number;
  y?: number;
};

// ---------------------------------------------------------------------------
// useDraggableBlock — tracks which block the pointer is hovering so the drag
// handle can position itself next to it. This is used to position the drag handle
// and the target line.
// ---------------------------------------------------------------------------

export function useDraggableBlock(
  noteContainerRef: RefObject<HTMLElement | null> | null
) {
  const [draggableBlockElement, setDraggableBlockElement] = useAtom(
    draggableBlockElementAtom
  );
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!noteContainerRef?.current) return;
    const noteContainerValue = noteContainerRef.current;
    function handleMouseMove(e: MouseEvent) {
      if (!noteContainerValue) {
        return;
      }
      const target = e.target;

      if (!(target instanceof HTMLElement)) return;
      if (isOnHandle(target) || target.id === 'target-line') return;

      const newDraggableBlockElem = getBlockElement({
        event: e,
        editor,
        noteContainer: noteContainerValue,
      });
      setDraggableBlockElement(newDraggableBlockElem);
    }

    function handleMouseLeave() {
      setDraggableBlockElement(null);
    }

    noteContainerRef.current.addEventListener('mousemove', handleMouseMove);
    noteContainerRef.current.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      noteContainerRef?.current?.removeEventListener(
        'mousemove',
        handleMouseMove
      );
      noteContainerRef?.current?.removeEventListener(
        'mouseleave',
        handleMouseLeave
      );
    };
  }, [noteContainerRef]);

  return { draggableBlockElement, setDraggableBlockElement };
}

// ---------------------------------------------------------------------------
// useInsertFilesOnEditorDrop — consumes the Wails `EDITOR_CONTENT_DROP` event
// fired after the native runtime has finished copying OS files into the note
// folder, and inserts Lexical `FileNode`s at the drop point.
// ---------------------------------------------------------------------------

function useInsertFilesOnEditorDrop({
  editor,
  filePath,
  dragAndDropCaretMotionValues,
}: {
  editor: LexicalEditor;
  filePath: FilePath;
  dragAndDropCaretMotionValues: DragAndDropCaretMotionValues;
}) {
  const { mutateAsync: addDroppedFilesToFolder } =
    useAddDroppedFilesToFolderMutation();

  function onEditorContentDrop(event: WailsEvent) {
    setTimeout(() => {
      // timeout helps to avoid issue with stale caret
      dragAndDropCaretMotionValues.opacity.set(0);
    }, 100);
    const data = event.data as EditorContentDropEventData;
    const droppedFiles = data.droppedFiles ?? [];
    if (droppedFiles.length === 0) return;

    void addDroppedFilesToFolder({
      folderPath: filePath.folder,
      filePaths: droppedFiles,
    }).then((newPaths) => {
      const filePayloads: FilePayload[] = [];
      for (const rawPath of newPaths) {
        const relative = rawPath.startsWith(NOTES_PREFIX)
          ? rawPath.slice(NOTES_PREFIX.length)
          : rawPath;
        const fp = createFilePath(relative);
        if (!fp) continue;
        filePayloads.push({ alt: fp.noteWithoutExtension, src: fp.fileUrl });
      }

      if (filePayloads.length === 0) return;

      editor.update(() => {
        if (typeof data.x === 'number' && typeof data.y === 'number') {
          setSelectionFromPointerInNoteEditor(editor, data.x, data.y);
        }
        editor.dispatchCommand(INSERT_FILES_COMMAND, filePayloads);
      });
    });
  }

  useWailsEvent(EDITOR_CONTENT_DROP, onEditorContentDrop);
}

// ---------------------------------------------------------------------------
// useNodeDragEvents — orchestrator that builds `DragContext`, registers the
// Lexical commands, and patches the Wails runtime globals.
// ---------------------------------------------------------------------------

export function useNodeDragEvents({
  editor,
  filePath,
  isEditorContentDragging,
  noteContainerRef,
  targetLineYMotionValue,
  dragAndDropCaretMotionValues,
}: {
  editor: LexicalEditor;
  filePath: FilePath;
  isEditorContentDragging: boolean;
  noteContainerRef: RefObject<HTMLElement | null> | null;
  targetLineYMotionValue: MotionValue<number>;
  dragAndDropCaretMotionValues: DragAndDropCaretMotionValues;
}) {
  const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);
  const noteContainer = noteContainerRef?.current;
  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);

  useInsertFilesOnEditorDrop({
    editor,
    filePath,
    dragAndDropCaretMotionValues,
  });

  useEffect(() => {
    const isFileTreeDrag = draggedGhostElement?.id === FILE_TREE_GHOST_ID;

    const updateBlockTargetLine = throttle((event: DragEvent) => {
      const { pageY, target } = event;
      if (!target || !isHTMLElement(target) || !noteContainer) return false;
      const targetBlockElem = getBlockElement({
        event,
        editor,
        noteContainer,
        useEdgeAsDefault: true,
      });
      if (!targetBlockElem) return false;
      setTargetLine({
        targetBlockElem,
        mouseY: pageY / calculateZoomLevel(target),
        noteContainer,
        yMotionValue: targetLineYMotionValue,
      });
      return true;
    }, 100);

    const ctx: DragContext = {
      editor,
      noteContainer,
      noteContainerRef,
      draggedGhostElement,
      isEditorContentDragging,
      isFileTreeDrag,
      targetLineYMotionValue,
      dragAndDropCaretMotionValues,
      setDraggableBlockElement,
      updateBlockTargetLine,
    };

    // Wails bridges OS-level file drags through `window._wails` globals since
    // DOM `dragover` never fires on macOS/Linux. Wrap them to drive our caret.
    const restoreWailsHooks = installWailsDragHandlers({
      onDragOver: (x, y) => externalFiles.wailsDragOver(x, y, ctx),
    });

    const unregisterLexical = mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => dispatchDragOver(event, ctx),
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => dispatchDrop(event, ctx),
        COMMAND_PRIORITY_NORMAL
      )
    );

    return () => {
      unregisterLexical();
      restoreWailsHooks?.();
    };
  }, [
    editor,
    noteContainerRef,
    isEditorContentDragging,
    draggedGhostElement,
    dragAndDropCaretMotionValues,
  ]);
}
