import {
  $getNearestNodeFromDOMNode,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { createGhostElementFromHtmlElement } from '../../../../utils/draggable';
import { constructGhostElementForNode } from '../ghost-elements';
import {
  DRAGGABLE_BLOCK_MENU_CLASSNAME,
  DRAG_DATA_FORMAT,
} from './constants';

/**
 * Builds the ghost element for the block being dragged and wires the Lexical
 * node key into the event's `dataTransfer` so the drop handler can look it up.
 */
export function handleDragStart({
  e,
  editor,
  setIsDragging,
  draggableBlockElement,
  setDraggedGhostElement,
  noteContainer,
}: {
  e: DragEvent;
  editor: LexicalEditor;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  draggableBlockElement: HTMLElement | null;
  setDraggedGhostElement: Dispatch<SetStateAction<HTMLElement | null>>;
  noteContainer: HTMLElement | null;
}) {
  if (!e.dataTransfer || !draggableBlockElement) {
    return;
  }

  let nodeKey = '';
  const ghostElement = createGhostElementFromHtmlElement({
    element: draggableBlockElement,
    classNames: ['dragging'],
    useNoteContainer: true,
  });
  ghostElement.id = 'block-element';
  editor.read(() => {
    const node = $getNearestNodeFromDOMNode(draggableBlockElement);
    if (!node) return;
    if ((node as ElementNode).getChildren) {
      const elementNode = node as ElementNode;
      elementNode.getChildren().forEach((child) => {
        constructGhostElementForNode(child, ghostElement);
      });
    } else {
      constructGhostElementForNode(node, ghostElement);
    }
    nodeKey = node.getKey();
  });

  if (noteContainer) {
    ghostElement.style.fontFamily = noteContainer.style.fontFamily;
    ghostElement.style.maxWidth = `${noteContainer.clientWidth}px`;
  }
  setDraggedGhostElement(ghostElement);

  e.dataTransfer.setDragImage(ghostElement, 0, 0);
  document.body.appendChild(ghostElement);

  setIsDragging(true);
  e.dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
}

/** Returns `true` when the hovered element is (or is inside) the drag handle. */
export function isOnHandle(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}
