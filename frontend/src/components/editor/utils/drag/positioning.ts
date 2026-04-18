import type { MotionValue } from 'motion/react';
import type { Dispatch, SetStateAction } from 'react';
import { getCollapsedMargins } from './block-lookup';

/**
 * Moves the block-reorder target line under the pointer, snapping to either the
 * top or bottom edge of `targetBlockElem` based on `mouseY`.
 */
export function setTargetLine({
  targetBlockElem,
  mouseY,
  noteContainer,
  yMotionValue,
}: {
  targetBlockElem: HTMLElement;
  mouseY: number;
  noteContainer: HTMLElement;
  yMotionValue: MotionValue<number>;
}) {
  const { top: targetBlockElemTop, height: targetBlockElemHeight } =
    targetBlockElem.getBoundingClientRect();
  const { top: noteContainerTop } = noteContainer.getBoundingClientRect();
  const { marginTop, marginBottom } = getCollapsedMargins(targetBlockElem);
  let lineTop = targetBlockElemTop;
  if (mouseY >= targetBlockElemTop) {
    lineTop += targetBlockElemHeight + marginBottom / 2;
  } else {
    lineTop -= marginTop / 2;
  }
  const top = lineTop - noteContainerTop - 4 + noteContainer.scrollTop;

  yMotionValue.set(top);
}

/**
 * Positions the drag-handle next to the currently-hovered block, or hides it
 * when there is no target.
 */
export function setHandlePosition({
  draggableBlockElement,
  handle,
  noteContainer,
  setIsHandleShowing,
  yMotionValue,
}: {
  draggableBlockElement: HTMLElement | null;
  handle: HTMLElement;
  noteContainer: HTMLElement;
  setIsHandleShowing: Dispatch<SetStateAction<boolean>>;
  yMotionValue: MotionValue<number>;
}) {
  if (!draggableBlockElement) {
    setIsHandleShowing(false);
    return;
  }

  const draggableBlockRect = draggableBlockElement.getBoundingClientRect();
  const draggableBlockStyle = window.getComputedStyle(draggableBlockElement);
  const handleRect = handle.getBoundingClientRect();
  const noteContainerRect = noteContainer.getBoundingClientRect();

  const elementLineHeight = Number.parseInt(draggableBlockStyle.lineHeight, 10);

  const cleanedElementLineHeight = Number.isNaN(elementLineHeight)
    ? 0
    : elementLineHeight;

  const top =
    draggableBlockRect.top +
    (cleanedElementLineHeight - handleRect.height) / 2 -
    noteContainerRect.top +
    noteContainer.scrollTop;
  yMotionValue.set(top);

  setIsHandleShowing(true);
}
