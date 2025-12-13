import { AnimatePresence } from 'motion/react';
import { useAtom } from 'jotai';
import {
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import { selectionRangeAtom } from '../../atoms';
import { keepSelectionNotesWithPrefix } from '../../utils/selection';
import { SidebarHighlight } from './highlight';
import { SidebarContentType } from '../../types';

type SidebarListItemProps<T> = {
  dataItem: T;
  allData: T[];
  index: number;
  dataItemToString: (item: T) => string;
  dataItemToSelectionRangeEntry: (item: T) => string;
  getContextMenuStyle?: (dataItem: T) => CSSProperties;
  hoveredItem: string | null;
  setHoveredItem: Dispatch<SetStateAction<string | null>>;
  anchorSelectionIndexRef: RefObject<number>;
  layoutId: string;
  contentType: SidebarContentType;
  shouldHideSidebarHighlight?: boolean;
  children: ReactNode;
};

export function SidebarListItem<T>({
  dataItem,
  allData,
  index,
  dataItemToString,
  dataItemToSelectionRangeEntry,
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
  const selectionRangeEntry = `${contentType}:${dataItemToSelectionRangeEntry(dataItem)}`;

  /**
   * Handles shift-click behavior for multi-selection by selecting a range of items
   * between the anchor index and the clicked index
   */
  function handleShiftClick(targetIndex: number) {
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
        if (e.shiftKey) handleShiftClick(index);
        else if (e.metaKey || e.ctrlKey) handleCommandClick(index);
        else {
          anchorSelectionIndexRef.current = index;
          setSelectionRange(new Set());
        }
      }}
    >
      {!shouldHideSidebarHighlight && (
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
