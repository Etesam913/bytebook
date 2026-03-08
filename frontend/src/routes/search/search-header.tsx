import { getDefaultButtonVariants } from '../../animations';
import { CircleArrowLeft } from '../../icons/circle-arrow-left';
import { MotionIconButton } from '../../components/buttons';
import { useAtomValue } from 'jotai';
import { useLocation } from 'wouter';
import { KeyboardEvent } from 'react';
import { SearchResultsHeader } from './results/search-results-header';
import { Input } from '../../components/input';
import { isFullscreenAtom } from '../../atoms';
import { cn } from '../../utils/string-formatting';
import { SearchOptions } from './search-options';
import { Tooltip } from '../../components/tooltip';
import { SearchResult, useSearchFocus } from '../../hooks/search';
import { buildSearchFileHrefFromPath } from './utils';

export function SearchHeader({
  lastSearchQuery,
  setLastSearchQuery,
  selectedIndex,
  setSelectedIndex,
  results,
  totalCount,
}: {
  lastSearchQuery: string;
  setLastSearchQuery: (query: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  results: SearchResult[];
  totalCount: number;
}) {
  const inputRef = useSearchFocus();
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const [, setLocation] = useLocation();

  const handleArrowDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Move selected index down
    e.preventDefault();
    if (totalCount === 0) return;
    setSelectedIndex((prev) =>
      Math.min(prev < 0 ? 0 : prev + 1, totalCount - 1)
    );
  };

  const handleArrowUp = (e: KeyboardEvent<HTMLInputElement>) => {
    // Move selected index up
    e.preventDefault();
    if (totalCount === 0) return;
    setSelectedIndex((prev) => (prev <= 0 ? 0 : prev - 1));
  };

  const handleEnter = () => {
    // Navigate to the selected result and open the note or folder with the highlight if available
    if (selectedIndex >= 0 && selectedIndex < totalCount) {
      const result = results[selectedIndex];

      if (result.type === 'note') {
        const firstHighlightedTerm = result.highlights[0]?.highlightedTerm;
        const href = firstHighlightedTerm
          ? buildSearchFileHrefFromPath(result.filePath.fullPath, {
              highlight: firstHighlightedTerm,
            })
          : buildSearchFileHrefFromPath(result.filePath.fullPath);
        setLocation(href);
      } else if (result.type === 'attachment') {
        setLocation(buildSearchFileHrefFromPath(result.filePath.fullPath));
      }
    }
  };

  const handleEscape = (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    window.history.back();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const handlers: Record<
      string,
      (e: KeyboardEvent<HTMLInputElement>) => void
    > = {
      ArrowDown: handleArrowDown,
      ArrowUp: handleArrowUp,
      Enter: handleEnter,
      Escape: handleEscape,
    };

    if (e.key in handlers) {
      handlers[e.key](e);
    }
  };

  return (
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
            onKeyDown: handleKeyDown,
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
  );
}
