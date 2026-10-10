import { SidebarContentType } from '@/types';

/** Selects are represent as strings with a separator between the prefix and value.
 *
 * @example
 * "file:123"
 * "tag:Python"
 * "kernel:python"
 * "search-result:Python"
 * "saved-search:Python"
 * "folder:docs"
 * "tag:Python"
 */
const SIDEBAR_SELECTION_SEPARATOR = ':';

export type SetSelectionUpdater = (
  updater: (prev: Set<string>) => Set<string>
) => void;

/**
 * Creates a selection key by joining the prefix and value with a separator.
 */
export function createSelectionKey(prefix: string, value: string): string {
  return `${prefix}${SIDEBAR_SELECTION_SEPARATOR}${value}`;
}

/**
 * Filters a selection set to keep only items with the specified prefix.
 */
export function keepSelectionWithPrefix(
  selection: Set<string>,
  prefix: string
) {
  return new Set(
    [...selection].filter((item) =>
      item.startsWith(`${prefix}${SIDEBAR_SELECTION_SEPARATOR}`)
    )
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
  setSelectionRange: SetSelectionUpdater;
  itemType: SidebarContentType;
  itemName: string;
  onlyOne?: boolean;
}): Set<string> {
  let newSelectionRange = new Set([createSelectionKey(itemType, itemName)]);

  setSelectionRange((prev) => {
    if (onlyOne || prev.size === 0) {
      // Only allow one item in the selection set
      newSelectionRange = new Set([createSelectionKey(itemType, itemName)]);
      return newSelectionRange;
    }
    const setWithoutItems = keepSelectionWithPrefix(prev, itemType);
    setWithoutItems.add(createSelectionKey(itemType, itemName));
    newSelectionRange = setWithoutItems;
    return setWithoutItems;
  });

  return newSelectionRange;
}

export const FILE_SELECTION_PREFIX = 'file';
