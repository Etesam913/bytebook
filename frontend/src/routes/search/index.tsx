import {
  lastSearchQueryAtom,
  useFullTextSearchQuery,
} from '../../hooks/search';
import { DEFAULT_SONNER_OPTIONS } from '../../utils/general';
import { useAtom } from 'jotai';
import { useDeferredValue, useState } from 'react';
import { SearchHeader } from './search-header';
import { SearchResultsList } from './results/search-results-list';
import { Browser } from '@wailsio/runtime';
import { toast } from 'sonner';

const SEARCH_DOCS_URL = 'https://example.com/docs/search';

const SEARCH_EXAMPLES = [
  {
    query: '"The red tiger"',
    helperText: 'Find exact phrase matches in notes and file names.',
  },
  {
    query: 'f:apple',
    helperText: 'Find files or folders with "apple" in the name.',
  },
  {
    query: 'f:docs/readme',
    helperText: 'Match files named "readme" inside folders like "docs".',
  },
  {
    query: '#Economics',
    helperText: 'Find notes tagged with "Economics".',
  },
  {
    query: 'sort:updated auth',
    helperText: 'Sort results by last update time while searching for "auth".',
  },
] as const;

export function SearchPage() {
  const [lastSearchQuery, setLastSearchQuery] = useAtom(lastSearchQueryAtom);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const deferredQuery = useDeferredValue(lastSearchQuery);

  const {
    data: groupedResults = { notes: [], attachments: [] },
    isError,
    error,
  } = useFullTextSearchQuery(deferredQuery);

  const totalCount =
    groupedResults.notes.length + groupedResults.attachments.length;

  return (
    <section className="flex-1 h-screen flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
      <SearchHeader
        lastSearchQuery={lastSearchQuery}
        setLastSearchQuery={setLastSearchQuery}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        groupedResults={groupedResults}
        totalCount={totalCount}
      />
      <div className="flex-1 overflow-auto">
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
          <div className="flex justify-center items-center flex-1 px-6 py-3">
            <div className="w-full max-w-4xl text-zinc-700 dark:text-zinc-300">
              <h2 className="text-2xl py-3 text-zinc-800 dark:text-zinc-200">
                Search examples
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Use these sample queries to get started quickly.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SEARCH_EXAMPLES.map((example) => (
                  <div
                    key={example.query}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/70 dark:bg-zinc-850 dark:border-zinc-700 p-3"
                  >
                    <p className="font-code text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {example.query}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {example.helperText}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm">
                <button
                  type="button"
                  className="app-link"
                  onClick={() => {
                    Browser.OpenURL(SEARCH_DOCS_URL).catch(() => {
                      toast.error(
                        `Failed to open link: ${SEARCH_DOCS_URL}`,
                        DEFAULT_SONNER_OPTIONS
                      );
                    });
                  }}
                >
                  Read the full search docs
                </button>
              </div>
            </div>
          </div>
        )}

        {totalCount === 0 && lastSearchQuery.trim() && !isError && (
          <div className="flex justify-center items-center flex-1 py-3 px-6 text-center text-zinc-600 dark:text-zinc-400">
            No results found. Try adjusting your search terms.
          </div>
        )}

        {totalCount > 0 && (
          <SearchResultsList
            groupedResults={groupedResults}
            selectedIndex={selectedIndex}
            totalCount={totalCount}
          />
        )}
      </div>
    </section>
  );
}
