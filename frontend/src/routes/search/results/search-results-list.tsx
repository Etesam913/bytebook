import { useRef, useEffect } from 'react';
import { SearchResult } from '../../../hooks/search';
import {
  SearchResultNote,
  SearchResultAttachment,
  SearchResultFolder,
} from './search-result-item';
import { VirtualizedList } from '../../../components/virtualized/virtualized-list';
import { dataItemToKey, dataItemToString } from '../utils';

export function SearchResultsList({
  results,
  selectedIndex,
  endReached,
}: {
  results: SearchResult[];
  selectedIndex: number;
  endReached?: () => void;
}) {
  const totalCount = results.length;

  // Refs to track search result items for scrolling
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Update refs array when total count changes
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, totalCount);
  }, [totalCount]);

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < totalCount) {
      const selectedElement = itemRefs.current[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex, totalCount]);

  return (
    <VirtualizedList<SearchResult>
      contentType="search-result"
      layoutId="search-results"
      data={results}
      selectionOptions={{ disableSelection: true }}
      dataItemToKey={dataItemToKey}
      dataItemToString={dataItemToString}
      endReached={endReached}
      renderItem={({ dataItem: result, i }) => {
        switch (result.type) {
          case 'note':
            return (
              <SearchResultNote
                data={result}
                resultIndex={i}
                selectedIndex={selectedIndex}
                onRef={(el) => {
                  if (i >= 0) {
                    itemRefs.current[i] = el;
                  }
                }}
              />
            );
          case 'attachment':
            return (
              <SearchResultAttachment
                data={result}
                resultIndex={i}
                selectedIndex={selectedIndex}
                onRef={(el) => {
                  if (i >= 0) {
                    itemRefs.current[i] = el;
                  }
                }}
              />
            );
          case 'folder':
            return (
              <SearchResultFolder
                data={result}
                resultIndex={i}
                selectedIndex={selectedIndex}
                onRef={(el) => {
                  if (i >= 0) {
                    itemRefs.current[i] = el;
                  }
                }}
              />
            );
        }
      }}
    />
  );
}
