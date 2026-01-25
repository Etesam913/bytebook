import { useRef, useEffect } from 'react';
import { GroupedSearchResults } from '../../../hooks/search';
import {
  SearchResultHeader,
  SearchResultNote,
  SearchResultAttachment,
  SearchResultFolder,
} from './search-result-item';
import { VirtualizedList } from '../../../components/virtualized/virtualized-list';
import { SearchRow, Section, dataItemToKey, dataItemToString } from '../utils';
import { useCollapsibleSections } from './useCollapsibleSections';

function getRowsWithHeaders(
  groupedResults: GroupedSearchResults,
  toggleSection: (section: Section) => void,
  openSections: Record<Section, boolean>
) {
  const rows: SearchRow[] = [];

  if (groupedResults.notes.length > 0) {
    rows.push({
      kind: 'header',
      title: 'notes',
      count: groupedResults.notes.length,
      toggle: () => toggleSection('notes'),
    });
    if (openSections.notes) {
      groupedResults.notes.forEach((note, index) => {
        rows.push({ kind: 'note', data: note, resultIndex: index });
      });
    }
  }

  if (groupedResults.attachments.length > 0) {
    rows.push({
      kind: 'header',
      title: 'attachments',
      count: groupedResults.attachments.length,
      toggle: () => toggleSection('attachments'),
    });
    if (openSections.attachments) {
      groupedResults.attachments.forEach((attachment, index) => {
        const resultIndex = groupedResults.notes.length + index;
        rows.push({ kind: 'attachment', data: attachment, resultIndex });
      });
    }
  }

  if (groupedResults.folders.length > 0) {
    rows.push({
      kind: 'header',
      title: 'folders',
      count: groupedResults.folders.length,
      toggle: () => toggleSection('folders'),
    });
    if (openSections.folders) {
      groupedResults.folders.forEach((folderItem, index) => {
        const resultIndex =
          groupedResults.notes.length +
          groupedResults.attachments.length +
          index;
        rows.push({ kind: 'folder', data: folderItem, resultIndex });
      });
    }
  }
  return rows;
}

export function SearchResultsList({
  groupedResults,
  selectedIndex,
  totalCount,
}: {
  groupedResults: GroupedSearchResults;
  selectedIndex: number;
  totalCount: number;
}) {
  // Refs to track search result items for scrolling
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Section open/closed state
  const { openSections, toggleSection } = useCollapsibleSections({
    notes: true,
    attachments: true,
    folders: true,
  });

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
    <VirtualizedList<SearchRow>
      contentType="search-result"
      layoutId="search-results"
      data={getRowsWithHeaders(groupedResults, toggleSection, openSections)}
      selectionOptions={{ disableSelection: true }}
      dataItemToKey={dataItemToKey}
      dataItemToString={dataItemToString}
      renderItem={({ dataItem: row }) => {
        switch (row.kind) {
          case 'header':
            return (
              <SearchResultHeader
                title={row.title}
                count={row.count}
                isOpen={openSections[row.title]}
                onToggle={row.toggle}
              />
            );
          case 'note':
            return (
              <SearchResultNote
                data={row.data}
                resultIndex={row.resultIndex}
                selectedIndex={selectedIndex}
                onRef={(el) => {
                  if (row.resultIndex >= 0) {
                    itemRefs.current[row.resultIndex] = el;
                  }
                }}
              />
            );
          case 'attachment':
            return (
              <SearchResultAttachment
                data={row.data}
                resultIndex={row.resultIndex}
                selectedIndex={selectedIndex}
                onRef={(el) => {
                  if (row.resultIndex >= 0) {
                    itemRefs.current[row.resultIndex] = el;
                  }
                }}
              />
            );
          case 'folder':
          default:
            return (
              <SearchResultFolder
                data={row.data}
                resultIndex={row.resultIndex}
                selectedIndex={selectedIndex}
                onRef={(el) => {
                  if (row.resultIndex >= 0) {
                    itemRefs.current[row.resultIndex] = el;
                  }
                }}
              />
            );
        }
      }}
    />
  );
}
