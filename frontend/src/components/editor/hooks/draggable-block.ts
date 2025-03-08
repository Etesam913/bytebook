import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { eventFiles } from '@lexical/rich-text';
import { calculateZoomLevel, mergeRegister } from '@lexical/utils';
import type { MotionValue } from 'framer-motion';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  type LexicalEditor,
  isHTMLElement,
} from 'lexical';
import { type RefObject, useEffect } from 'react';
import { draggableBlockElementAtom, draggedElementAtom } from '../../../atoms';
import { throttle } from '../../../utils/draggable';
import {
  DRAG_DATA_FORMAT,
  getBlockElement,
  isOnHandle,
  setTargetLine,
} from '../utils/draggable-block';

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
    const noteContainerValue = noteContainerRef?.current;
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
      const _draggableBlockElem = getBlockElement(
        e,
        editor,
        noteContainerValue
      );
      setDraggableBlockElement(_draggableBlockElem);
    }

    function handleMouseLeave() {
      setDraggableBlockElement(null);
    }

    noteContainerRef?.current?.addEventListener('mousemove', handleMouseMove);
    noteContainerRef?.current?.addEventListener('mouseleave', handleMouseLeave);

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
 * Updates the state of the target line based on the current mouse position when dragging
 */
export function useNodeDragEvents(
  editor: LexicalEditor,
  isDragging: boolean,
  noteContainerRef: RefObject<HTMLElement | null> | null,
  targetLineYMotionValue: MotionValue<number>
) {
  const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);
  const noteContainer = noteContainerRef?.current;
  const draggedElement = useAtomValue(draggedElementAtom);

  useEffect(() => {
    const handleDragOver = throttle((event: DragEvent) => {
      if (!isDragging) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }

      const { pageY, target } = event;
      if (!target || !isHTMLElement(target) || !noteContainer) {
        return false;
      }
      const targetBlockElem = getBlockElement(
        event,
        editor,
        noteContainer,
        true
      );

      if (targetBlockElem === null) return false;
      setTargetLine(
        targetBlockElem,
        pageY / calculateZoomLevel(target),
        noteContainer,
        targetLineYMotionValue
      );

      return true;
    }, 100);

    function handleOnDrop(event: DragEvent): boolean {
      if (!isDragging) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const { target, dataTransfer, pageY } = event;
      const dragData = dataTransfer?.getData(DRAG_DATA_FORMAT) || '';
      const draggedNode = $getNodeByKey(dragData);
      if (!draggedNode) {
        return false;
      }
      if (!target || !isHTMLElement(target) || !noteContainer) {
        return false;
      }
      const targetBlockElem = getBlockElement(
        event,
        editor,
        noteContainer,
        true
      );

      if (!targetBlockElem) {
        return false;
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (!targetNode) {
        return false;
      }
      if (targetNode === draggedNode) {
        return true;
      }
      const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top;
      if (pageY / calculateZoomLevel(target) >= targetBlockElemTop) {
        targetNode.insertAfter(draggedNode);
      } else {
        targetNode.insertBefore(draggedNode);
      }
      draggedNode.selectStart();
      setDraggableBlockElement(null);

      return true;
    }

    return mergeRegister(
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (e) => {
          /*
					 If an element out of the app is being dragged in, then let CONTROLLED_TEXT_INSERTION_COMMAND handle it
					 If it is in the app, but not a block element, then let CONTROLLED_TEXT_INSERTION_COMMAND handle it
					*/
          if (
            !draggedElement ||
            (draggedElement && draggedElement.id !== 'block-element')
          ) {
            return false;
          }
          e.preventDefault();
          return handleDragOver(e);
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        DROP_COMMAND,
        handleOnDrop,
        COMMAND_PRIORITY_NORMAL
      )
    );
  }, [editor, noteContainerRef, isDragging, draggedElement]);
}
