import type { Dispatch, KeyboardEvent, SetStateAction } from 'react';
import {
  extractInfoFromNoteName,
  convertNoteNameToDotNotation,
} from './string-formatting';

/**
 * Filters a selection Set to keep only items that start with the specified prefix.
 * @param selection - A Set of strings to filter
 * @param prefix - The prefix string to match against
 * @returns A new Set containing only the items that start with the prefix
 */
export function keepSelectionNotesWithPrefix(
  selection: Set<string>,
  prefix: 'folder' | 'note' | 'tag' | 'kernel'
) {
  return new Set(
    [...selection].filter((item) => item.startsWith(`${prefix}:`))
  );
}

/**
 * Handles selection range logic for context menus across different sidebar components.
 * Creates or updates the selection range when right-clicking on an item.
 * Optionally allows only one item in the selection set.
 * @param params - Object containing the selection parameters
 * @param params.setSelectionRange - Function to update the selection range
 * @param params.itemType - The type of item being selected ('folder', 'note', 'tag', 'kernel')
 * @param params.itemName - The name/identifier of the item being selected
 * @param params.onlyOne - If true, only allow one item in the selection set (default: false)
 * @returns The new selection range Set
 */
export function handleContextMenuSelection({
  setSelectionRange,
  itemType,
  itemName,
  onlyOne = false,
}: {
  setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  itemType: 'folder' | 'note' | 'tag' | 'kernel';
  itemName: string;
  onlyOne?: boolean;
}): Set<string> {
  let newSelectionRange = new Set([`${itemType}:${itemName}`]);

  setSelectionRange((prev) => {
    if (onlyOne || prev.size === 0) {
      // Only allow one item in the selection set
      newSelectionRange = new Set([`${itemType}:${itemName}`]);
      return newSelectionRange;
    }
    const setWithoutItems = keepSelectionNotesWithPrefix(prev, itemType);
    setWithoutItems.add(`${itemType}:${itemName}`);
    newSelectionRange = setWithoutItems;
    return setWithoutItems;
  });

  return newSelectionRange;
}

/**
 * Takes a selection range like {note:Chapter 1?ext=md} or {note:folderabc/Chapter 1?ext=md}, and returns a list of folder/noteName.extension strings
 * @param folder
 * @param selectionRange
 */
export function getFolderAndNoteFromSelectionRange(
  folder: string,
  selectionRange: Set<string>,
  isInTagsSidebar: boolean
) {
  return [...selectionRange].map((note) => {
    const noteWithoutWithoutPrefix = note.split(':')[1];
    if (isInTagsSidebar) {
      const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
        noteWithoutWithoutPrefix
      );
      const [folderName, noteName] = noteNameWithoutExtension.split('/');
      return `${folderName}/${noteName}.${queryParams.ext}`;
    }
    return `${folder}/${convertNoteNameToDotNotation(noteWithoutWithoutPrefix)}`;
  });
}

/**
 * Handles key navigation for a button element within a list.
 * @param e - The keyboard event
 * @param liAncestor - The parent list item element
 */
export function handleKeyNavigation(e: KeyboardEvent) {
  const buttonElem = e.target as HTMLButtonElement;
  const liAncestor = buttonElem.parentElement?.parentElement;
  if (!liAncestor) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextLi = liAncestor.nextElementSibling;
    if (nextLi) {
      const nextButton = nextLi.querySelector('button') as HTMLButtonElement;
      if (nextButton) nextButton.focus();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prevLi = liAncestor.previousElementSibling;
    if (prevLi) {
      const prevButton = prevLi.querySelector('button') as HTMLButtonElement;
      if (prevButton) prevButton.focus();
    }
  }
}
/**
 * Handles escape key behavior in the editor, toggling maximized state and managing focus.
 * @param e - The keyboard event
 * @param isNoteMaximized - Boolean indicating if note is currently maximized
 * @param setIsNoteMaximized - State setter function for the maximized state
 */
export function handleEditorEscape(
  e: KeyboardEvent,
  isNoteMaximized: boolean,
  setIsNoteMaximized: Dispatch<SetStateAction<boolean>>
) {
  if (e.key === 'Escape') {
    if (isNoteMaximized) {
      setIsNoteMaximized(false);

      setTimeout(() => {
        const selectedNoteButton = document.getElementById(
          'selected-note-button'
        );
        if (!selectedNoteButton) return;
        selectedNoteButton.focus();
      }, 250);
    } else {
      const selectedNoteButton = document.getElementById(
        'selected-note-button'
      );
      if (!selectedNoteButton) return;
      selectedNoteButton.focus();
    }
  }
}

function isSelectedNoteOrFolderInViewport(
  noteOrFolder: string,
  visibleItems: string[]
) {
  return visibleItems.includes(noteOrFolder);
}

export function scrollVirtualizedListToSelectedNoteOrFolder(
  noteOrFolder: string,
  items: string[],
  visibleItems: string[],
  sidebarItemHeight: number
) {
  if (isSelectedNoteOrFolderInViewport(noteOrFolder, visibleItems)) return -1;
  const indexOfSelectedItem = items.indexOf(noteOrFolder);
  if (indexOfSelectedItem === -1) return -1;
  return sidebarItemHeight * indexOfSelectedItem;
}
