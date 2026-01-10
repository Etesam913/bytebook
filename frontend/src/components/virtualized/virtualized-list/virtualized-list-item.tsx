import { AnimatePresence } from 'motion/react';
import { useAtom } from 'jotai';
import {
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import { selectionRangeAtom } from '../../../atoms';
import { keepSelectionNotesWithPrefix } from '../../../utils/selection';
import { SidebarHighlight } from './highlight';
import { SidebarContentType } from '../../../types';
import type { SelectionOptions } from './index';

type SidebarListItemProps<T> = {
  dataItem: T;
  allData: T[];
  index: number;
  dataItemToString: (item: T) => string;
  selectionOptions: SelectionOptions<T>;
  getContextMenuStyle?: (dataItem: T) => CSSProperties;
  hoveredItem: string | null;
  setHoveredItem: Dispatch<SetStateAction<string | null>>;
  anchorSelectionIndexRef: RefObject<number>;
  layoutId: string;
  contentType: SidebarContentType;
  shouldHideSidebarHighlight?: boolean;
  children: ReactNode;
};

export function VirtualizedListItem<T>({
  dataItem,
  allData,
  index,
  dataItemToString,
  selectionOptions,
  getContextMenuStyle,
  hoveredItem,
  setHoveredItem,
  anchorSelectionIndexRef,
  layoutId,
  contentType,
  shouldHideSidebarHighlight,
  children,
}: SidebarListItemProps<T>) {
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const dataItemString = dataItemToString(dataItem);
  const disableSelection = selectionOptions.disableSelection === true;
  const dataItemToSelectionRangeEntry =
    selectionOptions.disableSelection === true
      ? undefined
      : selectionOptions.dataItemToSelectionRangeEntry;
  const selectionRangeEntry = disableSelection
    ? ''
    : `${contentType}:${dataItemToSelectionRangeEntry!(dataItem)}`;

  /**
   * Handles shift-click behavior for multi-selection by selecting a range of items
   * between the anchor index and the clicked index
   */
  function handleShiftClick(targetIndex: number) {
    if (disableSelection || !dataItemToSelectionRangeEntry) return;
    if (!allData.length) return;
    const anchorIndex = anchorSelectionIndexRef.current ?? 0;
    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    const selectedElements: Set<string> = new Set();
    for (let j = start; j <= end; j++) {
      const item = allData[j];
      if (!item) continue;
      selectedElements.add(
        `${contentType}:${dataItemToSelectionRangeEntry(item)}`
      );
    }
    setSelectionRange(selectedElements);
  }

  /**
   * Handles command/ctrl-click behavior by toggling selection state of individual items
   * while preserving existing selections
   */
  function handleCommandClick(targetIndex: number) {
    if (disableSelection || !dataItemToSelectionRangeEntry) return;
    anchorSelectionIndexRef.current = targetIndex;
    setSelectionRange((prev) => {
      const newSelection = keepSelectionNotesWithPrefix(prev, contentType);
      if (newSelection.has(selectionRangeEntry)) {
        newSelection.delete(selectionRangeEntry);
      } else {
        newSelection.add(selectionRangeEntry);
      }
      return newSelection;
    });
  }

  return (
    <div
      onMouseEnter={() => setHoveredItem(dataItemString)}
      onMouseLeave={() => setHoveredItem(null)}
      style={getContextMenuStyle?.(dataItem)}
      className="flex items-center relative select-none rounded-md py-[.1rem]"
      onClick={(e) => {
        if (disableSelection) return;
        if (e.shiftKey) handleShiftClick(index);
        else if (e.metaKey || e.ctrlKey) handleCommandClick(index);
        else {
          anchorSelectionIndexRef.current = index;
          setSelectionRange(new Set());
        }
      }}
    >
      {!shouldHideSidebarHighlight && !disableSelection && (
        <AnimatePresence>
          {hoveredItem === dataItemString &&
            !selectionRange.has(selectionRangeEntry) && (
              <SidebarHighlight layoutId={layoutId} />
            )}
        </AnimatePresence>
      )}
      {children}
    </div>
  );
}
