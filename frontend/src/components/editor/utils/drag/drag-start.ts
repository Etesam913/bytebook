import {
  $getNearestNodeFromDOMNode,
  type ElementNode,
  type LexicalEditor,
} from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { createGhostElementFromHtmlElement } from '@utils/draggable';
import { constructGhostElementForNode } from '../ghost-elements';
import { DRAGGABLE_BLOCK_MENU_CLASSNAME, DRAG_DATA_FORMAT } from './constants';

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
  if (!e.dataTransfer || !draggableBlockElement || !noteContainer) {
    return;
  }

  let nodeKey = '';
  const ghostContent = createGhostElementFromHtmlElement({
    element: draggableBlockElement,
    classNames: [],
  });
  const ghostElement = document.createElement('div');
  ghostElement.id = 'block-element';
  ghostElement.className = 'editor-content editor-drag-ghost';
  ghostElement.setAttribute('aria-hidden', 'true');
  ghostElement.appendChild(ghostContent);

  editor.read(() => {
    const node = $getNearestNodeFromDOMNode(draggableBlockElement);
    if (!node) return;
    if ((node as ElementNode).getChildren) {
      const elementNode = node as ElementNode;
      elementNode.getChildren().forEach((child) => {
        constructGhostElementForNode(child, ghostContent);
      });
    } else {
      constructGhostElementForNode(node, ghostContent);
    }
    nodeKey = node.getKey();
  });

  const sourceWidth = draggableBlockElement.getBoundingClientRect().width;
  const sourceStyle = getComputedStyle(draggableBlockElement);
  ghostElement.style.width = `${Math.min(sourceWidth, noteContainer.clientWidth)}px`;
  ghostElement.style.fontFamily = sourceStyle.fontFamily;
  ghostElement.style.whiteSpace = sourceStyle.whiteSpace;
  ghostElement.style.color = sourceStyle.color;
  setDraggedGhostElement(ghostElement);

  // Keep the snapshot in the viewport and outside the editor's clipping scroll
  // container. The browser captures it after dragstart, before the next paint.
  document.body.appendChild(ghostElement);
  e.dataTransfer.setDragImage(ghostElement, 0, 0);
  requestAnimationFrame(() => {
    ghostElement.style.left = '-9999px';
  });

  setIsDragging(true);
  e.dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
}

/** Returns `true` when the hovered element is (or is inside) the drag handle. */
export function isOnHandle(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}
