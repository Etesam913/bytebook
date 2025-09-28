import { AnimatePresence } from 'motion/react';
import { useAtom } from 'jotai';
import {
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { SidebarContentType } from '.';
import { selectionRangeAtom } from '../../atoms';
import { keepSelectionNotesWithPrefix } from '../../utils/selection';
import { cn } from '../../utils/string-formatting';
import { SidebarHighlight } from './highlight';

export function SidebarItems<T>({
  allData,
  visibleData,
  dataItemToString,
  dataItemToSelectionRangeEntry,
  getContextMenuStyle,
  hoveredItem,
  setHoveredItem,
  renderLink,
  ref,
  emptyElement,
  layoutId,
  startIndex,
  contentType,
  shouldHideSidebarHighlight,
  isSidebarItemCard,
}: {
  allData: T[] | null;
  visibleData: T[] | null;
  dataItemToString: (item: T) => string;
  dataItemToSelectionRangeEntry: (item: T) => string;
  getContextMenuStyle?: (dataItem: T) => CSSProperties;
  hoveredItem: string | null;
  setHoveredItem: Dispatch<SetStateAction<string | null>>;
  renderLink: (data: {
    dataItem: T;
    i: number;
    selectionRange: Set<string>;
    setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  }) => ReactNode;
  ref: RefObject<number>;
  emptyElement?: ReactNode;
  layoutId: string;
  startIndex: number;
  contentType: SidebarContentType;
  shouldHideSidebarHighlight?: boolean;
  isSidebarItemCard: boolean;
}) {
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);

  /**
   * Handles shift-click behavior for multi-selection by selecting a range of items
   * between the anchor index and the clicked index
   */
  function handleShiftClick(i: number, allData: T[]) {
    const start = Math.min(ref.current, startIndex + i);
    const end = Math.max(ref.current, startIndex + i);
    const selectedElements: Set<string> = new Set();
    for (let j = start; j <= end; j++)
      selectedElements.add(
        `${contentType}:${dataItemToSelectionRangeEntry(allData[j])}`
      );
    setSelectionRange(selectedElements);
  }

  /**
   * Handles command/ctrl-click behavior by toggling selection state of individual items
   * while preserving existing selections
   */
  function handleCommandClick(i: number, selectionRangeEntry: string) {
    ref.current = startIndex + i;
    setSelectionRange((prev) => {
      // Making sure to clean the selection so a folder selection and a note selection don't mix
      const newSelection = keepSelectionNotesWithPrefix(prev, contentType);

      // Whether the clicked element is already selected or not
      if (newSelection.has(selectionRangeEntry)) {
        newSelection.delete(selectionRangeEntry);
      } else {
        newSelection.add(selectionRangeEntry);
      }
      return newSelection;
    });
  }

  const dataElements =
    allData &&
    visibleData?.map((dataItem, i) => {
      const dataItemString = dataItemToString(dataItem);
      const selectionRangeEntry = `${contentType}:${dataItemToSelectionRangeEntry(dataItem)}`;

      return (
        <li
          onMouseEnter={() => {
            setHoveredItem(dataItemString);
          }}
          onMouseLeave={() => {
            setHoveredItem(null);
          }}
          key={dataItemString}
          className="py-[.1rem]"
          style={getContextMenuStyle?.(dataItem)}
        >
          <div
            className="flex items-center relative select-none rounded-md"
            onClick={(e) => {
              if (e.shiftKey) handleShiftClick(i, allData);
              else if (e.metaKey) handleCommandClick(i, selectionRangeEntry);
              // Regular click
              else {
                ref.current = startIndex + i;
                setSelectionRange(new Set());
              }
            }}
          >
            {!shouldHideSidebarHighlight && (
              <AnimatePresence>
                {hoveredItem === dataItemString &&
                  !selectionRange.has(selectionRangeEntry) && (
                    <SidebarHighlight
                      layoutId={layoutId}
                      className={cn(isSidebarItemCard && 'rounded-none')}
                    />
                  )}
              </AnimatePresence>
            )}
            {renderLink({
              dataItem,
              i: startIndex + i,
              selectionRange,
              setSelectionRange,
            })}
          </div>
        </li>
      );
    });
  return (
    <>{dataElements && dataElements.length > 0 ? dataElements : emptyElement}</>
  );
}
