import { SidebarContentType } from '@/types';

/* Selects are represent as strings with a separator between the prefix and value.
 *
 * Example:
 * "file:123"
 * "tag:Python"
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

// Use the full displayed order so ranges include virtualized, unmounted items.
export function getSelectionRange({
  items,
  anchor,
  target,
}: {
  items: readonly string[];
  anchor: string | null;
  target: string;
}): string[] {
  const targetIndex = items.indexOf(target);
  const anchorIndex = anchor === null ? -1 : items.indexOf(anchor);
  if (targetIndex < 0 || anchorIndex < 0) return [target];
  return items.slice(
    Math.min(anchorIndex, targetIndex),
    Math.max(anchorIndex, targetIndex) + 1
  );
}

export function toggleSelection(selection: Iterable<string>, target: string) {
  const result = new Set(selection);
  if (result.has(target)) result.delete(target);
  else result.add(target);
  return result;
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

/*
 * Handles selection range logic for context menus across different sidebar components.
 * Creates or updates the selection range when right-clicking on an item.
 * Optionally allows only one item in the selection set.
 * Returns the new selection range Set
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
