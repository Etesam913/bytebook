import { useSetAtom } from 'jotai';
import {
  SelectableItems,
  getFileSelectionPrefix,
  getKeyForSidebarSelection,
} from '../utils/selection';
import { atomWithLogging } from '../atoms';

export type SidebarSelection = {
  selections: Set<string>;
  anchorSelection: string | null;
};

export const sidebarSelectionAtom = atomWithLogging<SidebarSelection>(
  'sidebarSelectionAtom',
  {
    selections: new Set([]),
    anchorSelection: null,
  }
);

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
