import {
  lastSearchQueryAtom,
  useFullTextSearchQuery,
} from '../../hooks/search';
import { useAtom } from 'jotai';
import { useDeferredValue, useState } from 'react';
import { SearchHeader } from './search-header';
import { SearchResultsList } from './results/search-results-list';

export function SearchPage() {
  const [lastSearchQuery, setLastSearchQuery] = useAtom(lastSearchQueryAtom);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const deferredQuery = useDeferredValue(lastSearchQuery);

  const {
    data: groupedResults = { notes: [], attachments: [], folders: [] },
    isError,
    error,
  } = useFullTextSearchQuery(deferredQuery);

  const totalCount =
    groupedResults.notes.length +
    groupedResults.attachments.length +
    groupedResults.folders.length;

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
        {groupedResults.notes.length +
          groupedResults.attachments.length +
          groupedResults.folders.length ===
          0 &&
          !lastSearchQuery.trim() && (
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
        {groupedResults.notes.length +
          groupedResults.attachments.length +
          groupedResults.folders.length ===
          0 &&
          lastSearchQuery.trim() &&
          !isError && (
            <div className="flex justify-center items-center flex-1 py-3 px-6 text-center text-zinc-600 dark:text-zinc-400">
              No results found. Try adjusting your search terms.
            </div>
          )}
        <SearchResultsList
          groupedResults={groupedResults}
          selectedIndex={selectedIndex}
          totalCount={totalCount}
        />
      </div>
    </section>
  );
}
