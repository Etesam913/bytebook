import { useAtomValue } from 'jotai';
import type { CSSProperties, Ref, RefObject } from 'react';
import { searchPanelDataAtom } from '../../atoms';
import { mostRecentNotesAtom } from '../../atoms';
import { SearchItem } from './search-item';

export function SearchItems({
  isShowingMostRecentNotes,
  virtualizationState,
  ref,
  searchResultsContainerRef,
}: {
  isShowingMostRecentNotes: boolean;
  virtualizationState: {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    outerContainerStyle: CSSProperties;
    innerContainerStyle: CSSProperties;
    visibleItems: string[];
    startIndex: number;
  };
  ref: RefObject<(HTMLLIElement | null)[]>;
  searchResultsContainerRef: Ref<HTMLMenuElement>;
}) {
  const {
    onScroll,
    outerContainerStyle,
    innerContainerStyle,
    visibleItems,
    startIndex,
  } = virtualizationState;

  const searchPanelData = useAtomValue(searchPanelDataAtom);

  const mostRecentNotes = useAtomValue(mostRecentNotesAtom);

  const searchResultsElements = (
    isShowingMostRecentNotes ? mostRecentNotes : visibleItems
  ).map((filePath, i) => {
    const actualIndex = isShowingMostRecentNotes ? i : startIndex + i;
    const filePathString = isShowingMostRecentNotes
      ? `${filePath.folder}/${filePath.note}`
      : filePath;
    return (
      <SearchItem
        key={filePathString}
        ref={(el) => {
          ref.current[actualIndex] = el;
        }}
        i={actualIndex}
        filePath={filePathString}
      />
    );
  });

  return (
    <menu
      ref={searchResultsContainerRef}
      className="py-2 px-2 bg-zinc-50 max-h-[300px] dark:bg-zinc-800  absolute w-full border rounded-md rounded-tl-none rounded-tr-none border-zinc-300 dark:border-zinc-700 shadow-2xl -translate-y-1 overflow-y-auto overflow-x-hidden scroll-p-2"
      onScroll={isShowingMostRecentNotes ? undefined : onScroll}
    >
      {searchResultsElements.length === 0 ? (
        <p className="text-sm text-zinc-650 dark:text-zinc-300 pl-1.5">
          There are no notes named &quot;{searchPanelData.query}&quot;
        </p>
      ) : isShowingMostRecentNotes ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-1.5">
            Recent Notes
          </p>
          {searchResultsElements}
        </div>
      ) : (
        <div>
          <div
            style={{
              ...outerContainerStyle,
              height:
                visibleItems.length > 0 ? outerContainerStyle.height : 'auto',
            }}
          >
            <ul
              className="flex flex-col gap-1"
              style={{
                ...innerContainerStyle,
                height: visibleItems.length > 0 ? 'auto' : 'auto',
              }}
            >
              {searchResultsElements}
            </ul>
          </div>
        </div>
      )}
    </menu>
  );
}
