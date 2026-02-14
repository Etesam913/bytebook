import { useSetAtom } from 'jotai';
import {
  addSelectionKeysWithSinglePrefix,
  SelectableItems,
  getKeyForSidebarSelection,
} from '../utils/selection';
import { sidebarSelectionAtom } from '../atoms';

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
      return addSelectionKeysWithSinglePrefix({
        prevState: prev,
        selectionKeysToAdd,
        anchorSelectionKey:
          selectionKeysToAdd[selectionKeysToAdd.length - 1] ?? null,
      });
    });
  };
}
