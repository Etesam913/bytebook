import { useSetAtom } from 'jotai';
import {
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { sidebarSelectionAtom } from '../../../atoms';
import {
  createSelectionKey,
  keepSelectionWithPrefix,
} from '../../../utils/selection';
import { SidebarContentType } from '../../../types';
import type { SelectionOptions } from './index';

export function VirtualizedListItem<T>({
  dataItem,
  allData,
  index,
  dataItemToString,
  selectionOptions,
  getContextMenuStyle,
  setHoveredItem,
  contentType,
  children,
}: {
  dataItem: T;
  allData: T[];
  index: number;
  dataItemToString: (item: T) => string;
  selectionOptions: SelectionOptions<T>;
  getContextMenuStyle?: (dataItem: T) => CSSProperties;
  hoveredItem: string | null;
  setHoveredItem: Dispatch<SetStateAction<string | null>>;
  layoutId: string;
  contentType: SidebarContentType;
  children: ReactNode;
}) {
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
  const dataItemString = dataItemToString(dataItem);
  const disableSelection = selectionOptions.disableSelection === true;
  const dataItemToSelectionRangeEntry =
    selectionOptions.disableSelection === true
      ? undefined
      : selectionOptions.dataItemToSelectionRangeEntry;
  const selectionRangeEntry = disableSelection
    ? ''
    : createSelectionKey(contentType, dataItemToSelectionRangeEntry!(dataItem));

  /**
   * Handles shift-click behavior for multi-selection by selecting a range of items
   * between the anchor index and the clicked index
   */
  function handleShiftClick(targetIndex: number) {
    if (disableSelection || !dataItemToSelectionRangeEntry) return;
    if (!allData.length) return;
    setSidebarSelection((prev) => {
      const anchorSelectionEntry = prev.anchorSelection ?? selectionRangeEntry;
      const anchorIndex = allData.findIndex(
        (item) =>
          createSelectionKey(
            contentType,
            dataItemToSelectionRangeEntry(item)
          ) === anchorSelectionEntry
      );
      const resolvedAnchorIndex =
        anchorIndex === -1 ? targetIndex : anchorIndex;
      const start = Math.min(resolvedAnchorIndex, targetIndex);
      const end = Math.max(resolvedAnchorIndex, targetIndex);
      const selectedElements: Set<string> = new Set();
      for (let j = start; j <= end; j++) {
        const item = allData[j];
        if (!item) continue;
        selectedElements.add(
          createSelectionKey(contentType, dataItemToSelectionRangeEntry(item))
        );
      }

      return {
        ...prev,
        selections: selectedElements,
        anchorSelection: anchorSelectionEntry,
      };
    });
  }

  /**
   * Handles command/ctrl-click behavior by toggling selection state of individual items
   * while preserving existing selections
   */
  function handleCommandClick() {
    if (disableSelection || !dataItemToSelectionRangeEntry) return;
    setSidebarSelection((prev) => {
      const newSelection = keepSelectionWithPrefix(
        prev.selections,
        contentType
      );
      if (newSelection.has(selectionRangeEntry)) {
        newSelection.delete(selectionRangeEntry);
      } else {
        newSelection.add(selectionRangeEntry);
      }

      return {
        ...prev,
        selections: newSelection,
        anchorSelection: selectionRangeEntry,
      };
    });
  }

  return (
    <div
      onMouseEnter={() => setHoveredItem(dataItemString)}
      onMouseLeave={() => setHoveredItem(null)}
      style={getContextMenuStyle?.(dataItem)}
      className={'relative flex items-center rounded-md'}
      onClick={(e) => {
        if (disableSelection) return;
        if (e.shiftKey) handleShiftClick(index);
        else if (e.metaKey || e.ctrlKey) handleCommandClick();
        else {
          setSidebarSelection((prev) => ({
            ...prev,
            selections: new Set(),
            anchorSelection: selectionRangeEntry,
          }));
        }
      }}
    >
      {children}
    </div>
  );
}
