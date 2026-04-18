import type { MotionValue } from 'motion/react';
import { CONTENT_EDITABLE_ID, MIN_DROP_CARET_HEIGHT } from './constants';

/** Motion values that position the custom vertical caret during drags. */
export type DragAndDropCaretMotionValues = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  height: MotionValue<number>;
  opacity: MotionValue<number>;
};

/**
 * `Document.caretPositionFromPoint` is only included in newer TS DOM lib
 * versions; narrow the shape we rely on so this file typechecks regardless of
 * which `lib.dom.d.ts` the editor's TS server is using.
 */
type CaretPositionLike = { offsetNode: Node; offset: number };
type DocumentWithCaretPosition = Document & {
  caretPositionFromPoint?: (x: number, y: number) => CaretPositionLike | null;
};

/**
 * Resolves the DOM caret under a pointer and confirms it is inside the note
 * contenteditable. Returns a clamped `{ node, offset }` suitable for use with
 * `Range.setStart`/`Range.setEnd`, or `null` if the point is outside the editor
 * or the browser lacks `caretPositionFromPoint`.
 */
export function caretPositionFromPointInEditor(
  clientX: number,
  clientY: number
): { node: Node; offset: number } | null {
  const editorEl = document.getElementById(CONTENT_EDITABLE_ID);
  const caretPosition = (
    document as DocumentWithCaretPosition
  ).caretPositionFromPoint?.(clientX, clientY);
  if (
    !caretPosition?.offsetNode ||
    !editorEl?.contains(caretPosition.offsetNode)
  ) {
    return null;
  }
  const node = caretPosition.offsetNode;
  const maxOffset =
    node.nodeType === Node.TEXT_NODE
      ? (node as Text).length
      : node.nodeType === Node.ELEMENT_NODE
        ? (node as Element).childNodes.length
        : caretPosition.offset;
  return {
    node,
    offset: Math.min(Math.max(0, caretPosition.offset), maxOffset),
  };
}

/**
 * Resolves the line-height of the element that visually contains `node`.
 * Falls back to the element's box height, or a safe minimum.
 */
function getLineHeightForNode(node: Node): number {
  const lineEl =
    node.nodeType === Node.TEXT_NODE
      ? (node as Text).parentElement
      : (node as HTMLElement);
  if (!lineEl) return MIN_DROP_CARET_HEIGHT;
  const computed = Number.parseFloat(getComputedStyle(lineEl).lineHeight);
  if (Number.isFinite(computed) && computed > 0) return computed;
  return lineEl.getBoundingClientRect().height || MIN_DROP_CARET_HEIGHT;
}

/**
 * Computes a vertical insertion indicator (caret) position for file-tree drags,
 * in coordinates relative to `noteContainer` (for portaled overlays).
 */
export function getFileTreeDropCaretLayoutInNoteContainer(
  clientX: number,
  clientY: number,
  noteContainer: HTMLElement
): { left: number; top: number; height: number } | null {
  const caret = caretPositionFromPointInEditor(clientX, clientY);
  if (!caret) return null;

  const range = document.createRange();
  range.setStart(caret.node, caret.offset);
  range.setEnd(caret.node, caret.offset);
  const rect = range.getBoundingClientRect();
  // Collapsed ranges at the end of empty lines report near-zero height in some
  // browsers; fall back to the line-height of the containing block.
  const height =
    rect.height >= 4 ? rect.height : getLineHeightForNode(caret.node);

  const ncRect = noteContainer.getBoundingClientRect();
  return {
    left: rect.left - ncRect.left + noteContainer.scrollLeft,
    top: rect.top - ncRect.top + noteContainer.scrollTop,
    height,
  };
}
