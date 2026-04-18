import {
  $getNearestNodeFromDOMNode,
  $isElementNode,
  type LexicalEditor,
} from 'lexical';
import type { MotionValue } from 'motion/react';
import type { RefObject } from 'react';
import { FILE_TREE_GHOST_ID } from '../../../virtualized/virtualized-file-tree/utils/drag';
import { getBlockElement } from './block-lookup';
import {
  getFileTreeDropCaretLayoutInNoteContainer,
  type DragAndDropCaretMotionValues,
} from './caret';

/** Ghost `id`s that the drag dispatchers will handle. */
export const HANDLED_GHOST_IDS = new Set(['block-element', FILE_TREE_GHOST_ID]);

/**
 * Per-effect context shared by every drag-source helper and dispatcher. Built
 * inside `useNodeDragEvents` and passed by reference.
 */
export type DragContext = {
  editor: LexicalEditor;
  noteContainer: HTMLElement | null | undefined;
  noteContainerRef: RefObject<HTMLElement | null> | null;
  draggedGhostElement: HTMLElement | null;
  isEditorContentDragging: boolean;
  isFileTreeDrag: boolean;
  targetLineYMotionValue: MotionValue<number>;
  dragAndDropCaretMotionValues: DragAndDropCaretMotionValues;
  setDraggableBlockElement: (el: HTMLElement | null) => void;
  /** Pre-throttled block-reorder target-line updater. */
  updateBlockTargetLine: (event: DragEvent) => boolean;
};

/** Syncs the custom vertical caret to the pointer. */
export function updateFileTreeDropCaret(
  clientX: number,
  clientY: number,
  ctx: DragContext
): void {
  const container = ctx.noteContainerRef?.current ?? ctx.noteContainer;
  if (!container) return;
  const layout = getFileTreeDropCaretLayoutInNoteContainer(
    clientX,
    clientY,
    container
  );
  if (!layout) return;
  ctx.dragAndDropCaretMotionValues.x.set(layout.left);
  ctx.dragAndDropCaretMotionValues.y.set(layout.top);
  ctx.dragAndDropCaretMotionValues.height.set(layout.height);
  ctx.dragAndDropCaretMotionValues.opacity.set(1);
}

/**
 * Fallback selection: snap to the start/end of the nearest block based on
 * whether the pointer is above or below the block's top. Used when
 * `setSelectionFromPointerInNoteEditor` can't place a caret (e.g. dropping on
 * an image or code block).
 */
export function placeSelectionAtBlockEdge(
  event: DragEvent,
  mouseY: number,
  ctx: DragContext
): void {
  const { editor, noteContainer } = ctx;
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
