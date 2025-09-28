import { motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { easingFunctions } from '../../animations';
import { searchPanelDataAtom, trapFocusContainerAtom } from '../../atoms';
import { mostRecentNotesAtom } from '../../atoms';

import { useListVirtualization } from '../../hooks/observers';
import { useSearchMutation } from '../../hooks/search';
import { getFileExtension } from '../../utils/string-formatting';
import { SearchItems } from './search-items';
import { navigate } from 'wouter/use-browser-location';
import { routeUrls } from '../../utils/routes';

const SIDEBAR_ITEM_HEIGHT = 35;
const ITEMS_THAT_FIT_ON_SCREEN = 8;

export function SearchPanelForm() {
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);
  const albumRef = useRef<HTMLFormElement>(null);
  const setTrapFocusContainer = useSetAtom(trapFocusContainerAtom);
  const mostRecentNotes = useAtomValue(mostRecentNotesAtom);
  const isShowingMostRecentNotes =
    searchResults.length === 0 && searchPanelData.query.trim().length === 0;
  const searchResultsContainerRef = useRef<HTMLMenuElement | null>(null);
  const searchResultsRefs = useRef<(HTMLLIElement | null)[]>([]);
  const { mutateAsync: search } = useSearchMutation();
  const {
    visibleItems,
    onScroll: virtualOnScroll,
    outerContainerStyle,
    innerContainerStyle,
    startIndex,
  } = useListVirtualization({
    items: searchResults,
    itemHeight: SIDEBAR_ITEM_HEIGHT,
    listRef: searchResultsContainerRef,
    overscan: 2,
  });

  const onScroll = (e: React.UIEvent<HTMLElement>) => {
    virtualOnScroll(e);
    const element = e.target as HTMLElement;
    setSearchPanelData((prev) => ({
      ...prev,
      scrollY: element.scrollTop,
    }));
  };

  useEffect(() => {
    if (albumRef.current) {
      setTrapFocusContainer(albumRef.current);
    }

    return () => {
      setTrapFocusContainer(null);
    };
  }, [albumRef.current]);

  function handleArrowKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault();
    if (searchResultsContainerRef.current) {
      const resultRect =
        searchResultsRefs.current[
          searchPanelData.focusedIndex
        ]?.getBoundingClientRect();

      if (resultRect) {
        const containerRect =
          searchResultsContainerRef.current?.getBoundingClientRect();
        const distancetoEndOfContainer =
          containerRect?.bottom - resultRect.bottom;

        // 50 is the magic number, lol. Not a a very good explanation
        if (distancetoEndOfContainer < 50) {
          searchResultsContainerRef.current?.scrollBy(0, SIDEBAR_ITEM_HEIGHT);
        }
      }
    }

    setSearchPanelData((prev) => {
      // Check if the next item is out of bounds of the visible items
      if (
        !isShowingMostRecentNotes &&
        searchPanelData.focusedIndex + 1 >= visibleItems.length
      )
        return prev;
      // Determine if the next item is the last item in the search results
      const isIndexLastItem =
        visibleItems[searchPanelData.focusedIndex + 1] ===
        searchResults[searchResults.length - 1];
      // Update the focused index based on the current state and visibility
      return {
        ...prev,
        focusedIndex: Math.min(
          searchPanelData.focusedIndex + 1, // Attempt to move to the next item
          // Adjust the maximum index based on the visibility state
          isShowingMostRecentNotes
            ? mostRecentNotes.length - 1 // If showing most recent notes, use their length
            : ITEMS_THAT_FIT_ON_SCREEN - (isIndexLastItem ? 0 : 1) // Otherwise, use the screen capacity minus one if not the last item
        ),
      };
    });
  }

  function handleArrowKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault();

    if (searchResultsContainerRef.current) {
      const resultRect =
        searchResultsRefs.current[
          searchPanelData.focusedIndex
        ]?.getBoundingClientRect();
      if (resultRect) {
        const containerRect =
          searchResultsContainerRef.current?.getBoundingClientRect();
        const distanceToTopOfContainer = resultRect.top - containerRect.top;
        // 50 is the magic number, lol. Not a a very good explanation
        if (distanceToTopOfContainer < 50) {
          searchResultsContainerRef.current?.scrollBy(0, -SIDEBAR_ITEM_HEIGHT);
        }
      }
    }

    setSearchPanelData((prev) => {
      // We do not want negative indexes
      if (!isShowingMostRecentNotes && searchPanelData.focusedIndex - 1 < 0)
        return prev;

      // Check if the previous item is the first item in the search results
      const isIndexFirstItem =
        visibleItems[searchPanelData.focusedIndex - 1] === searchResults[0];

      return {
        ...prev,
        focusedIndex: Math.max(
          searchPanelData.focusedIndex - 1,
          // If it's the first item, we don't want to go below 0
          // Otherwise, we allow it to go to 1 (second item)
          isIndexFirstItem ? 0 : 1
        ),
      };
    });
  }

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.5, translate: '-50% -35%' }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: {
          ease: easingFunctions['ease-out-circ'],
          duration: 0.2,
        },
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-40 top-[25%] w-[min(29rem,90vw)] left-2/4"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!isShowingMostRecentNotes && searchResults.length === 0) return;

        const selectedResult = !isShowingMostRecentNotes
          ? (visibleItems[searchPanelData.focusedIndex] as string)
          : mostRecentNotes[searchPanelData.focusedIndex];
        const [folder, note] = selectedResult.split('/');
        const { extension, fileName } = getFileExtension(note);
        setSearchPanelData((prev) => ({ ...prev, isOpen: false }));
        if (folder && fileName && extension) {
          navigate(
            routeUrls.note(folder, fileName, { ext: extension, focus: true })
          );
        }
      }}
      ref={albumRef}
    >
      <input
        spellCheck="false"
        type="text"
        autoFocus
        name="search-query"
        placeholder="Search Files"
        className="py-3 px-4 bg-white dark:bg-zinc-800 outline-hidden will-change-transform w-full border-zinc-300 rounded-bl-none rounded-br-none border-b-0 dark:border-zinc-700 rounded-lg shadow-2xl border-[1.25px]"
        value={searchPanelData.query}
        onFocus={async (e) => {
          e.target.select();
          const res = await search({ searchQuery: e.target.value });
          setSearchResults(res);
          setTimeout(() => {
            searchResultsContainerRef.current?.scrollTo(
              0,
              searchPanelData.scrollY
            );
          }, 10);
        }}
        onChange={async (e) => {
          setSearchPanelData((prev) => ({
            ...prev,
            scrollY: 0,
            query: e.target.value,
            focusedIndex: 0,
          }));
          searchResultsContainerRef.current?.scrollTo(0, 0);
          const res = await search({ searchQuery: e.target.value });
          setSearchResults(res);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setSearchPanelData((prev) => ({
              ...prev,
              isOpen: false,
              focusedIndex: 0,
            }));
          } else if (e.key === 'ArrowDown') handleArrowKeyDown(e);
          else if (e.key === 'ArrowUp') handleArrowKeyUp(e);
        }}
      />
      <SearchItems
        isShowingMostRecentNotes={isShowingMostRecentNotes}
        searchResultsContainerRef={searchResultsContainerRef}
        ref={searchResultsRefs}
        virtualizationState={{
          onScroll,
          outerContainerStyle,
          innerContainerStyle,
          visibleItems: visibleItems as string[],
          startIndex,
        }}
      />
    </motion.form>
  );
}
