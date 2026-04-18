import { calculateZoomLevel } from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  isHTMLElement,
} from 'lexical';
import { getBlockElement } from '../block-lookup';
import { DRAG_DATA_FORMAT } from '../constants';
import type { DragContext } from '../context';

/** Block reorder: user grabbed the in-note drag handle. */
export const blockReorder = {
  dragOver(event: DragEvent, ctx: DragContext): boolean {
    return ctx.updateBlockTargetLine(event);
  },

  drop(event: DragEvent, ctx: DragContext): boolean {
    if (!ctx.isEditorContentDragging) return false;
    const { editor, noteContainer, setDraggableBlockElement } = ctx;
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
  },
};
