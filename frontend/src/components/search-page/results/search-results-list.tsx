import { useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { cn, formatDate, FilePath } from '../../../utils/string-formatting';
import { SearchHighlights } from './search-highlights';
import { SearchResult as BaseSearchResult } from '../../../../bindings/github.com/etesam913/bytebook/internal/search/models';
import { Tag } from '../../editor/bottom-bar/tag';

// Extended SearchResult type that includes the filePath property added by useFullTextSearchQuery
interface ExtendedSearchResult extends BaseSearchResult {
  filePath: FilePath;
}

export function SearchResultsList({
  searchResults,
  selectedIndex,
}: {
  searchResults: ExtendedSearchResult[];
  selectedIndex: number;
}) {
  // Refs to track search result items for scrolling
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Update refs array when searchResults length changes
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, searchResults.length);
  }, [searchResults.length]);

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
      const selectedElement = itemRefs.current[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex, searchResults.length]);

  return (
    <>
      {searchResults.map(
        ({ filePath, title, lastUpdated, created, tags, highlights }, idx) => {
          const path = filePath;
          let pathToNote = path.getLinkToNote();
          const firstHighlightedTerm = highlights[0]?.highlightedTerm;

          // Adding query param for the highlighted term
          if (firstHighlightedTerm) {
            pathToNote = path.getLinkToNote({
              highlight: firstHighlightedTerm,
            });
          }

          return (
            <Link
              key={pathToNote}
              to={pathToNote}
              draggable={false}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={cn(
                'flex flex-col gap-y-1 py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 focus-visible:outline-2 focus-visible:outline-sky-500 break-all',
                idx === selectedIndex && 'bg-zinc-100 dark:bg-zinc-700'
              )}
            >
              <div className="font-semibold">{title}</div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {path.toString()}
              </span>
              <SearchHighlights highlights={highlights} />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 text-xs">
                  {tags.map((tagName, tagIdx) => (
                    <Tag key={`${idx}-${tagIdx}`} tagName={tagName} />
                  ))}
                </div>
              )}
              <div className="flex gap-x-1 items-center justify-between text-xs">
                {lastUpdated && (
                  <div className="text-zinc-500 dark:text-zinc-400">
                    Updated {formatDate(lastUpdated, 'relative')}
                  </div>
                )}
                {created && (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Created {formatDate(created, 'yyyy-mm-dd')}
                  </span>
                )}
              </div>
            </Link>
          );
        }
      )}
    </>
  );
}
