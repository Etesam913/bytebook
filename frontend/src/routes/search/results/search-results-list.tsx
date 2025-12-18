import { useRef, useEffect, useState } from 'react';
import { cn, formatDate } from '../../../utils/string-formatting';
import { LocalFilePath } from '../../../utils/path';
import { GroupedSearchResults } from '../../../hooks/search';
import { Tag } from '../../../components/editor/bottom-bar/tag';
import { SearchHighlights } from './search-highlights';
import { SearchResultItem } from './search-result-item';
import { VirtualizedList } from '../../../components/sidebar';
import { motion } from 'motion/react';

function dataItemToKey(row: Row): string {
  switch (row.kind) {
    case 'header':
      return `header-${row.title}`;
    case 'note':
      return `note-${row.data.filePath.toString()}`;
    case 'attachment':
      return `attachment-${row.data.toString()}`;
    case 'folder':
      return `folder-${row.data}`;
  }
}

function dataItemToString(row: Row): string {
  switch (row.kind) {
    case 'header':
      return row.title;
    case 'note':
      return row.data.filePath.note;
    case 'attachment':
      return row.data.note;
    case 'folder':
      return row.data;
  }
}

type Row =
  | { kind: 'header'; title: string; count: number; toggle: () => void }
  | {
      kind: 'note';
      data: GroupedSearchResults['notes'][number];
      resultIndex: number;
    }
  | { kind: 'attachment'; data: LocalFilePath; resultIndex: number }
  | { kind: 'folder'; data: string; resultIndex: number };

function useCollapsibleSections(defaultOpen: Record<string, boolean>) {
  const [openSections, setOpenSections] = useState(defaultOpen);

  function toggleSection(section: string) {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }
  return { openSections, toggleSection };
}

export function SearchResultsList({
  groupedResults,
  selectedIndex,
  allResults,
}: {
  groupedResults: GroupedSearchResults;
  selectedIndex: number;
  allResults: Array<
    | { filePath: LocalFilePath; type: 'note' | 'attachment' }
    | { folder: string; type: 'folder' }
  >;
}) {
  // Refs to track search result items for scrolling
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Section open/closed state
  const { openSections, toggleSection } = useCollapsibleSections({
    notes: true,
    attachments: true,
    folders: true,
  });

  // Update refs array when allResults length changes
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, allResults.length);
  }, [allResults.length]);

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < allResults.length) {
      const selectedElement = itemRefs.current[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex, allResults.length]);

  const rows: Row[] = [];

  if (groupedResults.notes.length > 0) {
    rows.push({
      kind: 'header',
      title: 'Notes',
      count: groupedResults.notes.length,
      toggle: () => toggleSection('notes'),
    });
    if (openSections.notes) {
      groupedResults.notes.forEach((note) => {
        const resultIndex = allResults.findIndex(
          (r) => r.type === 'note' && r.filePath.equals(note.filePath)
        );
        rows.push({ kind: 'note', data: note, resultIndex });
      });
    }
  }

  if (groupedResults.attachments.length > 0) {
    rows.push({
      kind: 'header',
      title: 'Attachments',
      count: groupedResults.attachments.length,
      toggle: () => toggleSection('attachments'),
    });
    if (openSections.attachments) {
      groupedResults.attachments.forEach((filePath) => {
        const resultIndex = allResults.findIndex(
          (r) => r.type === 'attachment' && r.filePath.equals(filePath)
        );
        rows.push({ kind: 'attachment', data: filePath, resultIndex });
      });
    }
  }

  if (groupedResults.folders.length > 0) {
    rows.push({
      kind: 'header',
      title: 'Folders',
      count: groupedResults.folders.length,
      toggle: () => toggleSection('folders'),
    });
    if (openSections.folders) {
      groupedResults.folders.forEach((folder) => {
        const resultIndex = allResults.findIndex(
          (r) => r.type === 'folder' && r.folder === folder
        );
        rows.push({ kind: 'folder', data: folder, resultIndex });
      });
    }
  }

  return (
    <VirtualizedList<Row>
      contentType="note"
      layoutId="search-results"
      data={rows}
      shouldHideSidebarHighlight
      selectionOptions={{ disableSelection: true }}
      dataItemToKey={dataItemToKey}
      dataItemToString={dataItemToString}
      renderItem={({ dataItem: row }) => {
        if (row.kind === 'header') {
          return (
            <button
              type="button"
              className={cn(
                'px-2 py-1 w-full flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700 bg-transparent select-none',
                'transition-colors duration-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              )}
              onClick={row.toggle}
              aria-expanded={openSections[row.title]}
              tabIndex={0}
            >
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: openSections[row.title] ? 90 : 0 }}
                className={'inline-block'}
                aria-hidden="true"
              >
                ▶
              </motion.span>
              {row.title} ({row.count})
            </button>
          );
        }

        if (row.kind === 'note') {
          const { filePath, tags, lastUpdated, created, highlights } = row.data;
          const resultIndex = row.resultIndex;
          let pathToNote = filePath.getLinkToNote();
          const firstHighlightedTerm = highlights[0]?.highlightedTerm;

          if (firstHighlightedTerm) {
            pathToNote = filePath.getLinkToNote({
              highlight: firstHighlightedTerm,
            });
          }

          return (
            <SearchResultItem
              to={pathToNote}
              title={filePath.note}
              iconType="note"
              resultIndex={resultIndex}
              selectedIndex={selectedIndex}
              onRef={(el) => {
                if (resultIndex >= 0) {
                  itemRefs.current[resultIndex] = el;
                }
              }}
              pathDisplay={filePath.toString()}
            >
              <SearchHighlights highlights={highlights} />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 text-xs">
                  {tags.map((tagName, tagIdx) => (
                    <Tag
                      key={`${filePath.toString()}-${tagIdx}`}
                      tagName={tagName}
                    />
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
            </SearchResultItem>
          );
        }

        if (row.kind === 'attachment') {
          const filePath = row.data;
          const resultIndex = row.resultIndex;
          const pathToNote = filePath.getLinkToNote();

          return (
            <SearchResultItem
              to={pathToNote}
              title={filePath.note}
              iconType="attachment"
              resultIndex={resultIndex}
              selectedIndex={selectedIndex}
              onRef={(el) => {
                if (resultIndex >= 0) {
                  itemRefs.current[resultIndex] = el;
                }
              }}
              pathDisplay={filePath.toString()}
            />
          );
        }

        const folder = row.data;
        const resultIndex = row.resultIndex;
        const pathToFolder = `/notes/${folder}`;

        return (
          <SearchResultItem
            to={pathToFolder}
            title={folder}
            iconType="folder"
            resultIndex={resultIndex}
            selectedIndex={selectedIndex}
            onRef={(el) => {
              if (resultIndex >= 0) {
                itemRefs.current[resultIndex] = el;
              }
            }}
          />
        );
      }}
    />
  );
}
