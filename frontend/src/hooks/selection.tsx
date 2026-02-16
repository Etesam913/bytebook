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
    let newSelections = new Set<string>();
    setSidebarSelection((prev) => {
      const items = Array.isArray(itemsToSelect)
        ? itemsToSelect
        : [itemsToSelect];

      if (items.length === 0) {
        newSelections = prev.selections;
        return prev;
      }

      const selectionKeysToAdd = items.map(getKeyForSidebarSelection);
      const nextState = addSelectionKeysWithSinglePrefix({
        prevState: prev,
        selectionKeysToAdd,
        anchorSelectionKey:
          selectionKeysToAdd[selectionKeysToAdd.length - 1] ?? null,
      });
      newSelections = nextState.selections;
      return nextState;
    });
    return newSelections;
  };
}
