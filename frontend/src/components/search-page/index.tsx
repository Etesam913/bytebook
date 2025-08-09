import { getDefaultButtonVariants } from '../../animations';
import { CircleArrowLeft } from '../../icons/circle-arrow-left';
import { MotionIconButton } from '../buttons';
import { Input } from '../input';
import {
  lastSearchQueryAtom,
  useFullTextSearchQuery,
} from '../../hooks/search';
import { useAtom } from 'jotai';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';

export function SearchPage() {
  const [lastSearchQuery, setLastSearchQuery] = useAtom(lastSearchQueryAtom);

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [, setLocation] = useLocation();

  const {
    data: searchResults = [],
    isError,
    error,
  } = useFullTextSearchQuery(lastSearchQuery);

  return (
    <section className="py-2.75 flex-1 h-screen text-base flex flex-col font-code overflow-hidden text-zinc-900 dark:text-zinc-100">
      <header className="flex items-center gap-2 w-full pl-22 pr-4 pb-2 border-b-1 border-zinc-200 dark:border-zinc-700">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => window.history.back()}
        >
          <CircleArrowLeft height={20} width={20} />
        </MotionIconButton>
        <Input
          inputProps={{
            placeholder: 'Search',
            className: 'w-full text-sm',
            autoCapitalize: 'off',
            autoComplete: 'off',
            autoCorrect: 'off',
            spellCheck: false,
            autoFocus: true,
            value: lastSearchQuery,
            onFocus: (e) => e.target.select(),
            onChange: async (e) => {
              setLastSearchQuery(e.target.value);
              setSelectedIndex(-1);
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
                  const [folder, note] = selected.path.split('/');
                  const href = `/${encodeURIComponent(folder ?? '')}/${encodeURIComponent(
                    note ?? ''
                  )}?ext=md`;
                  setLocation(href);
                }
              }
            },
          }}
          labelProps={{}}
        />
      </header>
      <div className="flex-1 overflow-auto pr-1 flex flex-col">
        {/* {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex-1"
          >
            <LoadingSpinner height={24} width={24} />
          </motion.div>
        )} */}
        {isError && (
          <div className="w-full flex-1 flex justify-center items-center">
            <div className="text-sm text-red-600 dark:text-red-400">
              {
                (error instanceof Error
                  ? error.message
                  : 'Something went wrong') as string
              }
            </div>
          </div>
        )}
        {searchResults.length === 0 && (
          <div className="flex justify-center items-center flex-1">
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <h2 className="text-2xl py-3 text-center text-zinc-800 dark:text-zinc-200">
                Search examples
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Type{' '}
                  <b className="text-zinc-900 dark:text-zinc-100">
                    "The red tiger"
                  </b>{' '}
                  to search for files that contain the phrase "The red tiger"
                </li>
                <li>
                  Use{' '}
                  <b className="text-zinc-900 dark:text-zinc-100">f:apple</b> to
                  search for files or folders that start with "apple"
                </li>
                <li>
                  Use{' '}
                  <b className="text-zinc-900 dark:text-zinc-100">
                    f:docs/readme
                  </b>{' '}
                  to search for files starting with "readme" in folders starting
                  with "docs"
                </li>
              </ol>
            </div>
          </div>
        )}
        {searchResults.map((result, idx) => {
          const [folder, note] = result.path.split('/');
          const href = `/${encodeURIComponent(folder ?? '')}/${encodeURIComponent(
            note ?? ''
          )}?ext=md`;
          return (
            <Link
              key={result.path}
              href={href}
              draggable={false}
              className={`block py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-sky-500 ${
                idx === selectedIndex ? 'bg-zinc-100 dark:bg-zinc-700' : ''
              }`}
            >
              <div className="text-sm font-semibold">{result.title}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {result.path}
              </div>
              {result.lastUpdated && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Updated {result.lastUpdated}
                </div>
              )}
              {(result.highlights?.length ?? 0) > 0 && (
                <div className="mt-1 space-y-1">
                  {(result.highlights ?? []).slice(0, 3).map((h, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-neutral-700 dark:text-neutral-300"
                      dangerouslySetInnerHTML={{ __html: h }}
                    />
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
