import { atom, useSetAtom } from 'jotai';
import {
  SelectableItems,
  getFileSelectionPrefix,
  getKeyForSidebarSelection,
} from '../utils/selection';

export type SidebarSelection = {
  selections: Set<string>;
  anchorSelection: string | null;
};

export const sidebarSelectionAtom = atom<SidebarSelection>({
  selections: new Set([]),
  anchorSelection: null,
});

/**
 * A hook to add items to the sidebar selection
 */
export function useAddToSidebarSelection() {
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);

  return (itemsToSelect: SelectableItems | SelectableItems[]) => {
    setSidebarSelection((prev) => {
      const items = Array.isArray(itemsToSelect)
        ? itemsToSelect
        : [itemsToSelect];

      console.log(items);
      if (items.length === 0) {
        return prev;
      }

      const selectionKeysToAdd = items.map(getKeyForSidebarSelection);
      const firstItemToAddSelectionKeyPrefix = getFileSelectionPrefix(
        selectionKeysToAdd[0]
      );

      // We have the assumption that each item in the selection set has the same selection prefix
      // Therefore, if the first item has a different selection prefix, we should clear the selection
      // and just add the new item
      const firstSelectionItemKey: string | undefined = prev.selections
        .values()
        .next().value;

      const firstExistingItemSelectionKeyPrefix = firstSelectionItemKey
        ? getFileSelectionPrefix(firstSelectionItemKey)
        : null;

      if (
        firstItemToAddSelectionKeyPrefix !== firstExistingItemSelectionKeyPrefix
      ) {
        return {
          selections: new Set(selectionKeysToAdd),
          anchorSelection:
            selectionKeysToAdd[selectionKeysToAdd.length - 1] ?? null,
        };
      }

      return {
        selections: new Set([...prev.selections, ...selectionKeysToAdd]),
        anchorSelection:
          selectionKeysToAdd[selectionKeysToAdd.length - 1] ?? null,
      };
    });
  };
}

/**
 * A hook to remove items from the sidebar selection
 */
export function useRemoveFromSidebarSelection() {
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);

  return (itemsToRemove: SelectableItems | SelectableItems[]) => {
    setSidebarSelection((prev) => {
      const items = Array.isArray(itemsToRemove)
        ? itemsToRemove
        : [itemsToRemove];
      if (items.length === 0) {
        return prev;
      }

      const selectionKeysToRemove = items.map(getKeyForSidebarSelection);
      const newSelection = new Set(prev.selections);
      for (const selectionKey of selectionKeysToRemove) {
        newSelection.delete(selectionKey);
      }

      const lastRemovedSelectionKey =
        selectionKeysToRemove[selectionKeysToRemove.length - 1] ?? null;
      const anchorSelection =
        newSelection.values().next().value ?? lastRemovedSelectionKey;

      return { selections: newSelection, anchorSelection };
    });
  };
}
