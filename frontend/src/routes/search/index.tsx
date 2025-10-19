import { getDefaultButtonVariants } from '../../animations';
import { CircleArrowLeft } from '../../icons/circle-arrow-left';
import { MotionIconButton } from '../../components/buttons';
import {
  lastSearchQueryAtom,
  useFullTextSearchQuery,
  useSearchFocus,
} from '../../hooks/search';
import { useAtom } from 'jotai';
import { useState } from 'react';
import { useLocation } from 'wouter';
import { SearchResultsList } from './results/search-results-list';
import { SearchResultsHeader } from './results/search-results-header';
import { Input } from '../../components/input';

export function SearchPage() {
  const [lastSearchQuery, setLastSearchQuery] = useAtom(lastSearchQueryAtom);
  const inputRef = useSearchFocus();

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [, setLocation] = useLocation();

  const {
    data: searchResults = [],
    isError,
    error,
  } = useFullTextSearchQuery(lastSearchQuery);

  return (
    <section className="pt-2.5 flex-1 h-screen flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
      <header className="w-full pr-4 border-b-1 border-zinc-200 dark:border-zinc-700 flex flex-col gap-1">
        <div className="pl-22 flex items-center gap-2">
          <MotionIconButton
            {...getDefaultButtonVariants()}
            onClick={() => window.history.back()}
          >
            <CircleArrowLeft height={20} width={20} />
          </MotionIconButton>
          <Input
            ref={inputRef}
            inputProps={{
              placeholder: 'Search',
              className: 'w-full font-code',
              autoCapitalize: 'off',
              autoComplete: 'off',
              autoCorrect: 'off',
              spellCheck: false,
              autoFocus: true,
              value: lastSearchQuery,
              onFocus: (e) => e.target.select(),
              onChange: async (e) => {
                setLastSearchQuery(e.target.value);
                setSelectedIndex(0);
              },
              onKeyDown: (e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (searchResults.length === 0) return;
                  setSelectedIndex((prev) =>
                    Math.min(prev < 0 ? 0 : prev + 1, searchResults.length - 1)
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (searchResults.length === 0) return;
                  setSelectedIndex((prev) => (prev <= 0 ? 0 : prev - 1));
                } else if (e.key === 'Enter') {
                  if (
                    selectedIndex >= 0 &&
                    selectedIndex < searchResults.length
                  ) {
                    const selected = searchResults[selectedIndex];
                    const highlights = selected.highlights;
                    const firstHighlightedTerm = highlights[0]?.highlightedTerm;
                    const href = firstHighlightedTerm
                      ? selected.filePath.getLinkToNote({
                          highlight: firstHighlightedTerm,
                        })
                      : selected.filePath.getLinkToNote();
                    setLocation(href);
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  window.history.back();
                }
              },
            }}
            labelProps={{}}
          />
        </div>
        <div>
          <SearchResultsHeader
            searchQuery={lastSearchQuery}
            resultCount={searchResults.length}
          />
        </div>
      </header>
      <div className="flex-1 overflow-auto pr-1">
        {isError && (
          <div className="w-full flex-1 flex justify-center items-center">
            <div className="text-red-600 dark:text-red-400">
              {
                (error instanceof Error
                  ? error.message
                  : 'Something went wrong') as string
              }
            </div>
          </div>
        )}
        {searchResults.length === 0 && !lastSearchQuery.trim() && (
          <div className="flex justify-center items-center flex-1 px-6">
            <div className="text-zinc-700 dark:text-zinc-300">
              <h2 className="text-2xl py-3 text-center text-zinc-800 dark:text-zinc-200">
                Search examples
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Type{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    "The red tiger"
                  </span>{' '}
                  to search for files that contain the phrase "The red tiger"
                </li>
                <li>
                  Use{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    f:apple
                  </span>{' '}
                  to search for files or folders that start with "apple"
                </li>
                <li>
                  Use{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    f:docs/readme
                  </span>{' '}
                  to search for files starting with "readme" in folders starting
                  with "docs"
                </li>
                <li>
                  Use{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    #Economics
                  </span>{' '}
                  to search for notes tagged with "Economics"
                </li>
              </ol>
            </div>
          </div>
        )}
        {searchResults.length === 0 && lastSearchQuery.trim() && !isError && (
          <div className="flex justify-center items-center flex-1 py-3 px-6 text-center text-zinc-600 dark:text-zinc-400">
            No results found. Try adjusting your search terms.
          </div>
        )}
        <SearchResultsList
          searchResults={searchResults}
          selectedIndex={selectedIndex}
        />
      </div>
    </section>
  );
}
