import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { LOAD_MORE_TYPE, type VirtualizedFileTreeItem } from '../types';

type FocusOptions = {
  shouldScroll?: boolean;
  direction?: 1 | -1;
};

type FileTreeNavigationContext = {
  virtualizedData: VirtualizedFileTreeItem[];
  internalListRef: RefObject<HTMLElement | null>;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
};

/**
 * Checks if the event target is an editable element like an input, textarea, or contenteditable element.
 */
function isEditableTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  if (!element) return false;
  return Boolean(element.closest('input, textarea, [contenteditable="true"]'));
}

/**
 * Extracts and parses the file tree index from an HTML element's data attribute.
 */
function getIndexFromElement(element: HTMLElement | null) {
  if (!element) return null;
  const rawIndex = element.dataset.fileTreeIndex;
  if (rawIndex === undefined) return null;
  const index = Number(rawIndex);
  return Number.isNaN(index) ? null : index;
}

/**
 * Finds and returns the DOM wrapper element for a file tree item at the specified index.
 */
function getItemWrapper(context: FileTreeNavigationContext, index: number) {
  if (!context.internalListRef.current) return null;
  return context.internalListRef.current.querySelector<HTMLElement>(
    `[data-file-tree-index="${index}"]`
  );
}

/**
 * Focuses the button element within a file tree item at the specified index.
 * If the item is not currently rendered, it will scroll to it first and then focus after a brief delay.
 */
function focusItemAtIndex(
  context: FileTreeNavigationContext,
  index: number,
  { shouldScroll = true, direction }: FocusOptions = {}
) {
  if (index < 0 || index >= context.virtualizedData.length) return;

  const existingWrapper = getItemWrapper(context, index);
  if (existingWrapper) {
    const focusTarget = existingWrapper.querySelector<HTMLElement>('button');
    focusTarget?.focus();
    return;
  }

  if (shouldScroll) {
    context.virtuosoRef.current?.scrollIntoView({
      index,
      // Keep down-arrow progression near the bottom edge and up-arrow near top,
      // instead of snapping every newly rendered row to the viewport top.
      align: direction === 1 ? 'end' : direction === -1 ? 'start' : 'start',
    });
  }

  const attemptFocusAfterRender = (attempt: number) => {
    const wrapper = getItemWrapper(context, index);
    const focusTarget = wrapper?.querySelector<HTMLElement>('button');
    if (focusTarget) {
      focusTarget.focus();
    }

    // Retry only while virtualization is still rendering the target row.
    if (!focusTarget && attempt < 6) {
      requestAnimationFrame(() => attemptFocusAfterRender(attempt + 1));
    }
  };

  requestAnimationFrame(() => attemptFocusAfterRender(1));
}

/**
 * Finds the next focusable item index in the specified direction, skipping over non-focusable items like "load more" rows.
 */
function findNextFocusableIndex(
  virtualizedData: VirtualizedFileTreeItem[],
  startIndex: number,
  direction: 1 | -1
) {
  let index = startIndex + direction;
  while (index >= 0 && index < virtualizedData.length) {
    if (virtualizedData[index]?.type !== LOAD_MORE_TYPE) {
      return index;
    }
    index += direction;
  }
  return null;
}

/**
 * Handles keyboard navigation within the file tree, supporting arrow keys for navigation and space for activation.
 * Prevents default behavior for navigation keys and ignores events from editable elements.
 */
export function handleFileTreeKeyDown(
  context: FileTreeNavigationContext,
  event: KeyboardEvent<HTMLDivElement>
) {
  if (isEditableTarget(event.target)) return;

  const isArrowDown = event.key === 'ArrowDown';
  const isArrowUp = event.key === 'ArrowUp';
  const isSpace = event.key === ' ' || event.code === 'Space';

  if (!isArrowDown && !isArrowUp && !isSpace) return;

  const target = event.target as HTMLElement | null;
  const currentWrapper = target
    ? target.closest<HTMLElement>('[data-file-tree-index]')
    : null;
  const currentIndex = getIndexFromElement(currentWrapper);

  if (isArrowDown || isArrowUp) {
    event.preventDefault();
    const direction = isArrowDown ? 1 : -1;
    const startIndex =
      typeof currentIndex === 'number' && !Number.isNaN(currentIndex)
        ? currentIndex
        : direction === 1
          ? -1
          : context.virtualizedData.length;

    const nextIndex = findNextFocusableIndex(
      context.virtualizedData,
      startIndex,
      direction
    );
    if (nextIndex === null) return;
    focusItemAtIndex(context, nextIndex, { direction });
    return;
  }

  if (isSpace) {
    event.preventDefault();
    if (currentIndex === null || Number.isNaN(currentIndex)) return;
    const wrapper = getItemWrapper(context, currentIndex);
    const focusTarget = wrapper?.querySelector<HTMLButtonElement>('button');
    focusTarget?.click();
  }
}

/**
 * Focuses the data item that was clicked
 */
export function handleFileTreeItemClickCapture(
  context: FileTreeNavigationContext,
  event?: MouseEvent<HTMLDivElement>
) {
  if (!event || isEditableTarget(event.target)) return;
  const index = getIndexFromElement(event.currentTarget);
  if (index === null) return;
  const dataItem = context.virtualizedData[index];
  if (!dataItem || dataItem.type === LOAD_MORE_TYPE) return;

  focusItemAtIndex(context, index, { shouldScroll: false });
}
