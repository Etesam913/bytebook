import { useSetAtom } from 'jotai';
import {
  addSelectionKeysWithSinglePrefix,
  SelectableItem,
  getKeyForSidebarSelection,
} from '../utils/selection';
import { sidebarSelectionAtom, type SidebarSelectionState } from '../atoms';

/**
 * A hook to add items to the sidebar selection
 */
export function useAddToSidebarSelection() {
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);

  return (
    itemsToSelect: SelectableItem | SelectableItem[]
  ): SidebarSelectionState => {
    let newState: SidebarSelectionState = {
      selections: new Set(),
      anchorSelection: null,
    };
    setSidebarSelection((prev) => {
      const items = Array.isArray(itemsToSelect)
        ? itemsToSelect
        : [itemsToSelect];

      if (items.length === 0) {
        newState = prev;
        return prev;
      }

      const selectionKeysToAdd = items.map(getKeyForSidebarSelection);
      const nextState = addSelectionKeysWithSinglePrefix({
        prevState: prev,
        selectionKeysToAdd,
        anchorSelectionKey:
          selectionKeysToAdd[selectionKeysToAdd.length - 1] ?? null,
      });
      newState = nextState;
      return nextState;
    });
    return newState;
  };
}
