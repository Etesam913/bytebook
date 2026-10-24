import { useSetAtom } from 'jotai';
import { type ReactNode } from 'react';
import { sidebarSelectionAtom } from '@/atoms';
import {
  createSelectionKey,
  getSelectionRange,
  keepSelectionWithPrefix,
  toggleSelection,
} from '@utils/selection';
import { SidebarContentType } from '@/types';
import type { SelectionOptions } from './index';

export function VirtualizedListItem<T>({
  dataItem,
  allData,
  index,
  selectionOptions,
  contentType,
  children,
}: {
  dataItem: T;
  allData: T[];
  index: number;
  selectionOptions: SelectionOptions<T>;
  contentType: SidebarContentType;
  children: ReactNode;
}) {
  const setSidebarSelection = useSetAtom(sidebarSelectionAtom);
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
      const items = allData.map((item) =>
        createSelectionKey(contentType, dataItemToSelectionRangeEntry(item))
      );

      return {
        ...prev,
        selections: new Set(
          getSelectionRange({
            items,
            anchor: anchorSelectionEntry,
            target: items[targetIndex],
          })
        ),
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
      return {
        ...prev,
        selections: toggleSelection(
          keepSelectionWithPrefix(prev.selections, contentType),
          selectionRangeEntry
        ),
        anchorSelection: selectionRangeEntry,
      };
    });
  }

  return (
    <div
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
