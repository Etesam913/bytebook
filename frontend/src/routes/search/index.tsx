import { getDefaultButtonVariants } from '../../animations';
import { CircleArrowLeft } from '../../icons/circle-arrow-left';
import { MotionIconButton } from '../../components/buttons';
import {
  lastSearchQueryAtom,
  useFullTextSearchQuery,
  useSearchFocus,
} from '../../hooks/search';
import { useAtom, useAtomValue } from 'jotai';
import { useDeferredValue, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { SearchResultsHeader } from './results/search-results-header';
import { Input } from '../../components/input';
import { isFullscreenAtom } from '../../atoms';
import { cn } from '../../utils/string-formatting';
import { SearchOptions } from './search-options';
import { Tooltip } from '../../components/tooltip';
import { SearchResultsList } from './results/search-results-list';

export function SearchPage() {
  const [lastSearchQuery, setLastSearchQuery] = useAtom(lastSearchQueryAtom);
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const inputRef = useSearchFocus();
  const [, setLocation] = useLocation();

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const deferredQuery = useDeferredValue(lastSearchQuery);

  const {
    data: groupedResults = { notes: [], attachments: [], folders: [] },
    isError,
    error,
  } = useFullTextSearchQuery(deferredQuery);

  // Flatten results for navigation and counting
  const allResults = useMemo(() => {
    const results = [
      ...groupedResults.notes.map((note) => ({
        filePath: note.filePath,
        type: 'note' as const,
      })),
      ...groupedResults.attachments.map((filePath) => ({
        filePath,
        type: 'attachment' as const,
      })),
      ...groupedResults.folders.map((folder) => ({
        folder,
        type: 'folder' as const,
      })),
    ];

    return results;
  }, [groupedResults]);

  const totalCount =
    groupedResults.notes.length +
    groupedResults.attachments.length +
    groupedResults.folders.length;

  return (
    <section className="flex-1 h-screen flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
      <header className="w-full pt-2.5 pb-1 pr-2 border-b border-zinc-200 dark:border-zinc-700 flex flex-col gap-1">
        <div
          className={cn(
            'pl-23 flex items-center gap-2',
            isFullscreen && 'pl-2.5'
          )}
        >
          <Tooltip content="Go back">
            <MotionIconButton
              {...getDefaultButtonVariants()}
              onClick={() => window.history.back()}
            >
              <CircleArrowLeft height={20} width={20} />
            </MotionIconButton>
          </Tooltip>
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
                setSelectedIndex(0);
                setLastSearchQuery(e.target.value);
              },
              onKeyDown: (e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (allResults.length === 0) return;
                  setSelectedIndex((prev) =>
                    Math.min(prev < 0 ? 0 : prev + 1, allResults.length - 1)
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (allResults.length === 0) return;
                  setSelectedIndex((prev) => (prev <= 0 ? 0 : prev - 1));
                } else if (e.key === 'Enter') {
                  if (selectedIndex >= 0 && selectedIndex < allResults.length) {
                    const selected = allResults[selectedIndex];
                    if (selected.type === 'folder') {
                      setLocation(`/notes/${selected.folder}`);
                    } else {
                      let href = selected.filePath.getLinkToNote();

                      // For notes, include highlight parameter if available (same as clicking)
                      if (selected.type === 'note') {
                        const noteResult = groupedResults.notes.find((note) =>
                          note.filePath.equals(selected.filePath)
                        );
                        const firstHighlightedTerm =
                          noteResult?.highlights[0]?.highlightedTerm;

                        if (firstHighlightedTerm) {
                          href = selected.filePath.getLinkToNote({
                            highlight: firstHighlightedTerm,
                          });
                        }
                      }

                      setLocation(href);
                    }
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  window.history.back();
                }
              },
            }}
            labelProps={{}}
          />
          <SearchOptions searchQuery={lastSearchQuery} />
        </div>
        <div>
          <SearchResultsHeader
            searchQuery={lastSearchQuery}
            resultCount={totalCount}
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
        {totalCount === 0 && !lastSearchQuery.trim() && (
          <div className="flex justify-center items-center flex-1 px-6">
            <div className="text-zinc-700 dark:text-zinc-300">
              <h2 className="text-2xl py-3 text-center text-zinc-800 dark:text-zinc-200">
                Search examples
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Type{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    &quot;The red tiger&quot;
                  </span>{' '}
                  to search for files that contain the phrase &quot;The red
                  tiger&quot;
                </li>
                <li>
                  Use{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    f:apple
                  </span>{' '}
                  to search for files or folders that start with
                  &quot;apple&quot;
                </li>
                <li>
                  Use{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    f:docs/readme
                  </span>{' '}
                  to search for files starting with &quot;readme&quot; in
                  folders starting with &quot;docs&quot;
                </li>
                <li>
                  Use{' '}
                  <span className="font-bold font-code text-zinc-900 dark:text-zinc-100">
                    #Economics
                  </span>{' '}
                  to search for notes tagged with &quot;Economics&quot;
                </li>
              </ol>
            </div>
          </div>
        )}
        {totalCount === 0 && lastSearchQuery.trim() && !isError && (
          <div className="flex justify-center items-center flex-1 py-3 px-6 text-center text-zinc-600 dark:text-zinc-400">
            No results found. Try adjusting your search terms.
          </div>
        )}
        <SearchResultsList
          groupedResults={groupedResults}
          selectedIndex={selectedIndex}
          allResults={allResults}
        />
      </div>
    </section>
  );
}
