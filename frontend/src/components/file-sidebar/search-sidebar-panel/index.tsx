import { type RefObject, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { navigate } from 'wouter/use-browser-location';
import { useRoute } from 'wouter';
import {
  type SearchResult,
  useFullTextSearchQuery,
  useSavedSearchSyncEvents,
  useSearchFocus,
} from '../../../hooks/search';
import { useSaveSearchDialog } from '../../../hooks/dialogs';
import {
  VirtualizedList,
  type VirtualizedListHandle,
} from '../../virtualized/virtualized-list';
import { SearchSidebarResultItem } from './search-sidebar-result-item';
import { ErrorText } from '../../error-text';
import { Loader } from '../../../icons/loader';
import { FileRefresh } from '../../../icons/file-refresh';
import { BookBookmark } from '../../../icons/book-bookmark';
import { createFilePath, safeDecodeURIComponent } from '../../../utils/path';
import { dataItemToKey, dataItemToString } from '../../../routes/search/utils';
import { Input } from '../../input';
import {
  ROUTE_PATTERNS,
  routeUrls,
  type SearchRouteParams,
} from '../../../utils/routes';
import { useAutoNavigateToFirstResult } from './hooks/use-auto-navigate-to-first-result';
import { MotionIconButton } from '../../buttons';
import { getDefaultButtonVariants } from '../../../animations';
import { Tooltip } from '../../tooltip';
import {
  focusItemAtIndex,
  handleSearchResultsKeyDown,
} from './search-results-navigation';

export function SearchSidebarPanel({
  lastSearchRouteRef,
  lastFilesRouteRef,
}: {
  lastSearchRouteRef: RefObject<string>;
  lastFilesRouteRef: RefObject<string>;
}) {
  const [, searchParams] = useRoute<SearchRouteParams>(ROUTE_PATTERNS.SEARCH);
  const routeSearchQuery = searchParams?.searchQuery
    ? safeDecodeURIComponent(searchParams.searchQuery)
    : '';

  const [internalSearchQuery, setInternalSearchQuery] =
    useState(routeSearchQuery);
  const encodedActivePath = searchParams?.['*'] || undefined;

  const inputRef = useSearchFocus();
  const listHandleRef = useRef<VirtualizedListHandle>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const openSaveSearchDialog = useSaveSearchDialog();
  const {
    data: results = [],
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isError,
    isLoading,
  } = useFullTextSearchQuery(internalSearchQuery);

  const decodedActivePath = encodedActivePath
    ? safeDecodeURIComponent(encodedActivePath)
        .split('/')
        .filter(Boolean)
        .join('/')
    : undefined;
  const activeFilePath = decodedActivePath
    ? createFilePath(decodedActivePath)
    : null;

  useSavedSearchSyncEvents({
    searchQuery: routeSearchQuery,
    activeNotePath: activeFilePath ?? undefined,
  });

  useAutoNavigateToFirstResult({
    internalSearchQuery,
    firstResultPath: results[0]?.filePath.encodedPath,
    lastSearchRouteRef,
    searchInputRef: inputRef,
  });

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      navigate(lastFilesRouteRef.current);
      return;
    }
    // Pressing down arrow key from the input focuses and navigates to the first result
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItemAtIndex({
        scrollContainer: scrollContainerRef.current,
        resultsLength: results.length,
        index: 0,
        listHandleRef,
      });
      const firstResult = results[0];
      if (firstResult) {
        navigate(
          routeUrls.search(
            internalSearchQuery,
            firstResult.filePath.encodedPath
          )
        );
      }
    }
  }

  function isResultActive(result: SearchResult): boolean {
    return activeFilePath ? result.filePath.equals(activeFilePath) : false;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 pt-1.5 pb-1">
      <div className="px-2 pb-2">
        <Input
          ref={(node) => {
            inputRef.current = node;
            // node?.focus();
            // node?.select();
          }}
          labelProps={{}}
          inputProps={{
            type: 'text',
            placeholder: 'Search...',
            value: internalSearchQuery,
            onChange: (e) => {
              setInternalSearchQuery(e.target.value);
            },
            onKeyDown: handleInputKeyDown,
            className: 'w-full text-sm py-1.5 px-2 rounded-md font-code',
            autoFocus: true,
            autoCapitalize: 'off',
            autoComplete: 'off',
            autoCorrect: 'off',
            spellCheck: false,
          }}
          clearable={true}
        />
      </div>

      <div className="pr-1 pl-3 flex items-center gap-2 mb-1">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {totalCount > 0 && <span>{totalCount} results</span>}
          {totalCount === 0 &&
            !isLoading &&
            !isError &&
            routeSearchQuery.trim() && <span>0 results found</span>}
        </p>
        {routeSearchQuery.trim() && (
          <Tooltip content="Save Search">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => openSaveSearchDialog(routeSearchQuery)}
              aria-label="Save Search"
              className="ml-auto"
            >
              <BookBookmark width="0.875rem" height="0.875rem" />
            </MotionIconButton>
          </Tooltip>
        )}
      </div>

      <section
        className="flex flex-col flex-1 overflow-y-auto min-h-0"
        onKeyDown={(e) =>
          handleSearchResultsKeyDown({
            inputRef,
            scrollContainer: scrollContainerRef.current,
            results,
            searchQuery: internalSearchQuery,
            listHandleRef,
            event: e,
          })
        }
      >
        {isError && (
          <ErrorText
            message="Something went wrong when retrieving the search results"
            onRetry={() => void refetch()}
            icon={
              <FileRefresh
                className="will-change-transform"
                width="1rem"
                height="1rem"
              />
            }
            className="text-center px-4"
          />
        )}

        {!isError &&
          (isLoading && internalSearchQuery.trim() ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Loader
                width="1.25rem"
                height="1.25rem"
                className="mx-auto my-3"
              />
            </motion.div>
          ) : (
            internalSearchQuery.trim() && (
              <VirtualizedList<SearchResult>
                ref={listHandleRef}
                scrollContainerRef={scrollContainerRef}
                contentType="note"
                key="search-sidebar"
                layoutId="search-sidebar"
                emptyElement={
                  <div className="text-zinc-500 dark:text-zinc-300 text-xs px-3.5 py-1 text-ellipsis whitespace-nowrap overflow-hidden">
                    No results found for &quot;{internalSearchQuery}&quot;
                  </div>
                }
                data={results}
                dataItemToString={dataItemToString}
                dataItemToKey={dataItemToKey}
                isItemActive={(result) => isResultActive(result)}
                selectionOptions={{ disableSelection: true }}
                renderItem={({ dataItem, i }) => (
                  <div data-search-result-index={i} className="w-full">
                    <SearchSidebarResultItem
                      result={dataItem}
                      searchQuery={internalSearchQuery}
                      isActive={isResultActive(dataItem)}
                    />
                  </div>
                )}
                endReached={() => {
                  if (!hasNextPage || isFetchingNextPage) return;
                  void fetchNextPage();
                }}
              />
            )
          ))}
      </section>
    </div>
  );
}
