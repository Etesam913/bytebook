import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { eventFiles } from '@lexical/rich-text';
import { calculateZoomLevel, mergeRegister } from '@lexical/utils';
import type { MotionValue } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $isElementNode,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_NORMAL,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  type LexicalEditor,
  isHTMLElement,
} from 'lexical';
import { type RefObject, useEffect } from 'react';
import {
  draggableBlockElementAtom,
  draggedGhostElementAtom,
} from '../atoms';
import { throttle } from '../../../utils/draggable';
import {
  DRAG_DATA_FORMAT,
  getBlockElement,
  getFileTreeDropCaretLayoutInNoteContainer,
  isOnHandle,
  setTargetLine,
} from '../utils/draggable-block';
import {
  overrideControlledTextInsertion,
  setSelectionFromPointerInNoteEditor,
} from '../utils/note-commands';
import { FILE_TREE_GHOST_ID } from '../../virtualized/virtualized-file-tree/utils/drag';

/** Motion values for the custom caret rendered during file-tree drags. */
type FileTreeDropCaretMotionValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  height: MotionValue<number>;
  opacity: MotionValue<number>;
};

/** Ghost `id`s that this hook should handle (block reorder + file-tree drop). */
const HANDLED_GHOST_IDS = new Set(['block-element', FILE_TREE_GHOST_ID]);

/**
 * Gets the hovered element and stores it in a state
 * Does some checks to make sure that it is valid for dragging
 */
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

      // The hovered element is not a HTMLElement
      if (!(target instanceof HTMLElement)) return;
      // If the hovered element is the handle itself, then there is nothing to do
      if (isOnHandle(target) || target.id === 'target-line') return;

      // Stores the block element that is being hovered in state
      const _draggableBlockElem = getBlockElement({
        event: e,
        editor,
        noteContainer: noteContainerValue,
      });
      setDraggableBlockElement(_draggableBlockElem);
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

/**
 * Updates the drag indicators (block target line and/or file-tree drop caret)
 * while content is being dragged over the note, and performs the drop.
 */
export function useNodeDragEvents({
  editor,
  isEditorContentDragging,
  noteContainerRef,
  targetLineYMotionValue,
  fileTreeDropCaret,
}: {
  editor: LexicalEditor;
  isEditorContentDragging: boolean;
  noteContainerRef: RefObject<HTMLElement | null> | null;
  targetLineYMotionValue: MotionValue<number>;
  fileTreeDropCaret?: FileTreeDropCaretMotionValues;
}) {
  const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);
  const noteContainer = noteContainerRef?.current;
  const draggedGhostElement = useAtomValue(draggedGhostElementAtom);

  useEffect(() => {
    const isFileTreeDrag = draggedGhostElement?.id === FILE_TREE_GHOST_ID;
    const isAnyDragging = isEditorContentDragging || isFileTreeDrag;

    /** Moves the horizontal block-reorder indicator under the pointer. Throttled. */
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

    /** Syncs the custom vertical caret to the pointer for file-tree drags. */
    function updateFileTreeDropCaret(event: DragEvent): void {
      const container = noteContainerRef?.current ?? noteContainer;
      if (!fileTreeDropCaret || !container) return;
      const layout = getFileTreeDropCaretLayoutInNoteContainer(
        event.clientX,
        event.clientY,
        container
      );
      if (!layout) {
        fileTreeDropCaret.opacity.set(0);
        return;
      }
      fileTreeDropCaret.x.set(layout.left);
      fileTreeDropCaret.y.set(layout.top);
      fileTreeDropCaret.height.set(layout.height);
      fileTreeDropCaret.opacity.set(1);
    }

    function handleDragOver(event: DragEvent): boolean {
      const [isFileTransfer] = eventFiles(event);

      // External OS file drag over the editor — show the vertical caret at the
      // pointer so the user can see where the file will land.
      if (isFileTransfer) {
        updateFileTreeDropCaret(event);
        return true;
      }

      if (!isAnyDragging) return false;

      if (isFileTreeDrag) {
        updateFileTreeDropCaret(event);
        return true;
      }
      return updateBlockTargetLine(event);
    }

    /**
     * Drop handler for drags coming from the file tree. Places the Lexical
     * selection at the pointer (with block-edge fallback) and delegates
     * insertion to `overrideControlledTextInsertion`.
     */
    function handleFileTreeDrop(event: DragEvent): boolean {
      if (!noteContainer) return false;
      const { target, pageY, clientX, clientY } = event;
      if (!target || !isHTMLElement(target)) return false;

      editor.update(() => {
        const placedAtPointer = setSelectionFromPointerInNoteEditor(
          editor,
          clientX,
          clientY
        );
        if (!placedAtPointer) {
          // If the user drops a file on an image or code block, it goes to the right or left
          // instead of the default which is the top of the note
          placeSelectionAtBlockEdge(event, pageY / calculateZoomLevel(target));
        }
        overrideControlledTextInsertion(event, editor, draggedGhostElement);
      });
      return true;
    }

    /**
     * Fallback selection: snap to the start/end of the nearest block based on
     * whether the pointer is above or below the block's top.
     */
    function placeSelectionAtBlockEdge(event: DragEvent, mouseY: number) {
      if (!noteContainer) return;
      const targetBlockElem = getBlockElement({
        event,
        editor,
        noteContainer,
        useEdgeAsDefault: true,
      });
      if (!targetBlockElem) return;
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (!targetNode || !$isElementNode(targetNode)) return;
      const targetTop = targetBlockElem.getBoundingClientRect().top;
      if (mouseY >= targetTop) targetNode.selectEnd();
      else targetNode.selectStart();
    }

    /** Drop handler for internal block reordering. */
    function handleBlockReorderDrop(event: DragEvent): boolean {
      if (!isEditorContentDragging) return false;
      const { target, dataTransfer, pageY } = event;
      if (!target || !isHTMLElement(target) || !noteContainer) return false;

      const draggedNodeKey = dataTransfer?.getData(DRAG_DATA_FORMAT) || '';
      const draggedNode = $getNodeByKey(draggedNodeKey);
      if (!draggedNode) return false;

      const targetBlockElem = getBlockElement({
        event,
        editor,
        noteContainer,
        useEdgeAsDefault: true,
      });
      if (!targetBlockElem) return false;

      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (!targetNode) return false;
      if (targetNode === draggedNode) return true;

      const targetTop = targetBlockElem.getBoundingClientRect().top;
      if (pageY / calculateZoomLevel(target) >= targetTop) {
        targetNode.insertAfter(draggedNode);
      } else {
        targetNode.insertBefore(draggedNode);
      }
      draggedNode.selectStart();
      setDraggableBlockElement(null);
      return true;
    }

    function handleOnDrop(event: DragEvent): boolean {
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        // Commit the Lexical selection at the pointer so the upcoming
        // `EditorContentDrop` Wails event (fired by the native runtime) can
        // insert files at the drop caret. We return false to let Wails handle
        // the native file-copy path.
        editor.update(() => {
          setSelectionFromPointerInNoteEditor(
            editor,
            event.clientX,
            event.clientY
          );
        });
        fileTreeDropCaret?.opacity.set(0);
        return false;
      }
      if (isFileTreeDrag) return handleFileTreeDrop(event);
      return handleBlockReorderDrop(event);
    }

    // On macOS (and Linux), Wails intercepts OS file drags natively, so DOM
    // `dragover` / `drop` events never fire in JS. Wails bridges via
    // `window._wails.handleDragOver(x, y)` (and `handleDragEnter` /
    // `handleDragLeave`). Wrap those to drive the fake drop caret.
    type WailsDragGlobals = {
      handleDragEnter?: () => void;
      handleDragOver?: (x: number, y: number) => void;
      handleDragLeave?: () => void;
      handlePlatformFileDrop?: (
        filenames: string[],
        x: number,
        y: number
      ) => void;
    };
    const wailsGlobals = (window as unknown as { _wails?: WailsDragGlobals })
      ._wails;
    let restoreWailsHooks: (() => void) | null = null;

    if (wailsGlobals) {
      const originalEnter = wailsGlobals.handleDragEnter;
      const originalOver = wailsGlobals.handleDragOver;
      const originalLeave = wailsGlobals.handleDragLeave;
      const originalDrop = wailsGlobals.handlePlatformFileDrop;

      wailsGlobals.handleDragEnter = () => {
        originalEnter?.();
      };

      wailsGlobals.handleDragOver = (x: number, y: number) => {
        originalOver?.(x, y);

        const container = noteContainerRef?.current;
        if (!container) return;

        const hoverTarget = document.elementFromPoint(x, y);
        if (!hoverTarget || !container.contains(hoverTarget)) {
          fileTreeDropCaret?.opacity.set(0);
          return;
        }

        updateFileTreeDropCaret({ clientX: x, clientY: y } as DragEvent);
      };

      wailsGlobals.handleDragLeave = () => {
        originalLeave?.();
        fileTreeDropCaret?.opacity.set(0);
      };

      // On macOS, native drop cleanup bypasses our wrapped `handleDragLeave`
      // (the runtime calls its private `cleanupNativeDrag` directly), so hide
      // the caret here when the platform-level file drop fires.
      wailsGlobals.handlePlatformFileDrop = (
        filenames: string[],
        x: number,
        y: number
      ) => {
        fileTreeDropCaret?.opacity.set(0);
        originalDrop?.(filenames, x, y);
      };

      restoreWailsHooks = () => {
        wailsGlobals.handleDragEnter = originalEnter;
        wailsGlobals.handleDragOver = originalOver;
        wailsGlobals.handleDragLeave = originalLeave;
        wailsGlobals.handlePlatformFileDrop = originalDrop;
      };
    }

    const unregisterLexical = mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => {
          const [isFileTransfer] = eventFiles(event);

          // Handle drags from inside the editor (block reorder), from the
          // file tree, and external OS file drags. Anything else falls
          // through to CONTROLLED_TEXT_INSERTION_COMMAND.
          if (!isFileTransfer) {
            if (!draggedGhostElement) return false;
            if (!HANDLED_GHOST_IDS.has(draggedGhostElement.id)) return false;
          }

          event.preventDefault();
          // Chromium does not paint a native insertion caret for these drags;
          // we render `#file-tree-drop-caret` and set dropEffect for feedback.
          if ((isFileTreeDrag || isFileTransfer) && event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
          }
          return handleDragOver(event);
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        DROP_COMMAND,
        handleOnDrop,
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
    fileTreeDropCaret,
  ]);
}
