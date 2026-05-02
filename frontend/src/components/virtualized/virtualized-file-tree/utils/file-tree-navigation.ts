import type { KeyboardEvent, MouseEvent, RefObject } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';
import { navigate } from 'wouter/use-browser-location';
import { CONTENT_EDITABLE_ID } from '../../../editor/utils/drag/constants';
import { createFilePath, createFolderPath } from '../../../../utils/path';
import {
  FILE_TYPE,
  FOLDER_TYPE,
  LOAD_MORE_TYPE,
  type VirtualizedFileTreeItem,
} from '../types';

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

function getNavigationTarget(dataItem: VirtualizedFileTreeItem) {
  if (dataItem.type === FILE_TYPE) {
    const filePath = createFilePath(dataItem.path);
    if (!filePath) return null;

    return {
      url: filePath.encodedFileUrl,
      shouldFocusEditor: filePath.extension === 'md',
    };
  }

  if (dataItem.type === FOLDER_TYPE) {
    const folderPath = createFolderPath(dataItem.path);
    if (!folderPath) return null;

    return {
      url: folderPath.encodedFolderUrl,
      shouldFocusEditor: false,
    };
  }

  return null;
}

/**
 * Focuses the note editor once it is mounted after route changes/loading. Utilizes
 * a number of attempts to account for the fact that there can be a little latency
 * associated with opening the note.
 */
const focusNoteEditor = (() => {
  const FOCUS_NOTE_EDITOR_MAX_ATTEMPTS = 20;

  return function focusNoteEditor(attempt = 1) {
    const editor = document.getElementById(CONTENT_EDITABLE_ID);
    if (editor) {
      editor.focus();
      return;
    }

    if (attempt < FOCUS_NOTE_EDITOR_MAX_ATTEMPTS) {
      requestAnimationFrame(() => focusNoteEditor(attempt + 1));
    }
  };
})();

/**
 * Handles keyboard navigation within the file tree, supporting arrow keys/vim keys for navigation and space for activation.
 * Prevents default behavior for navigation keys and ignores events from editable elements.
 */
export function handleFileTreeKeyDown(
  context: FileTreeNavigationContext,
  event: KeyboardEvent<HTMLDivElement>
) {
  if (isEditableTarget(event.target)) return;

  // j,k,l are for vim-like support
  const isDownKey = event.key === 'ArrowDown' || event.key === 'j';
  const isUpKey = event.key === 'ArrowUp' || event.key === 'k';
  const isFocusNoteKey = event.key === 'ArrowRight' || event.key === 'l';
  const isSpace = event.key === ' ' || event.code === 'Space';

  if (!isDownKey && !isUpKey && !isFocusNoteKey && !isSpace) return;

  const target = event.target as HTMLElement | null;
  const currentWrapper = target
    ? target.closest<HTMLElement>('[data-file-tree-index]')
    : null;
  const currentIndex = getIndexFromElement(currentWrapper);

  if (isDownKey || isUpKey) {
    event.preventDefault();
    const direction = isDownKey ? 1 : -1;
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

  if (isFocusNoteKey) {
    if (currentIndex === null || Number.isNaN(currentIndex)) return;

    const dataItem = context.virtualizedData[currentIndex];
    if (!dataItem) return;

    const navigationTarget = getNavigationTarget(dataItem);
    if (!navigationTarget) return;

    event.preventDefault();
    const isCurrentRoute = window.location.pathname === navigationTarget.url;
    if (!isCurrentRoute) {
      navigate(navigationTarget.url);
    }

    if (navigationTarget.shouldFocusEditor) {
      requestAnimationFrame(() => focusNoteEditor());
    }
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
