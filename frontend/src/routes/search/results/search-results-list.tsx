import { useRef, useEffect, useState } from 'react';
import { Link } from 'wouter';
import { cn, FilePath, formatDate } from '../../../utils/string-formatting';
import { getFileIcon } from '../../../components/sidebar/utils';
import { GroupedSearchResults } from '../../../hooks/search';
import { Tag } from '../../../components/editor/bottom-bar/tag';
import { SearchHighlights } from './search-highlights';
import { SearchResultsAccordion } from './search-results-accordion';

type FlatResult =
  | { filePath: FilePath; type: 'note' | 'attachment' }
  | { folder: string; type: 'folder' };

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
  allResults: FlatResult[];
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

  return (
    <>
      {/* Notes Section */}
      {groupedResults.notes.length > 0 && (
        <SearchResultsAccordion
          title="Notes"
          count={groupedResults.notes.length}
          isOpen={openSections.notes}
          onToggle={() => toggleSection('notes')}
        >
          {groupedResults.notes.map((note, idx) => {
            const { filePath, tags, lastUpdated, created, highlights } = note;
            const resultIndex = allResults.findIndex(
              (r) => r.type === 'note' && r.filePath.equals(filePath)
            );
            let pathToNote = filePath.getLinkToNote();
            const firstHighlightedTerm = highlights[0]?.highlightedTerm;

            // Adding query param for the highlighted term
            if (firstHighlightedTerm) {
              pathToNote = filePath.getLinkToNote({
                highlight: firstHighlightedTerm,
              });
            }

            return (
              <Link
                key={pathToNote}
                to={pathToNote}
                draggable={false}
                ref={(el) => {
                  if (resultIndex >= 0) {
                    itemRefs.current[resultIndex] = el;
                  }
                }}
                className={cn(
                  'flex flex-col gap-y-1 py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 focus-visible:outline-2 focus-visible:outline-sky-500 break-all',
                  resultIndex === selectedIndex &&
                    'bg-zinc-100 dark:bg-zinc-700'
                )}
              >
                <h3 className="font-semibold flex items-center gap-x-1.5">
                  {getFileIcon('note')} {filePath.note}
                </h3>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {filePath.toString()}
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
          })}
        </SearchResultsAccordion>
      )}

      {/* Attachments Section */}
      {groupedResults.attachments.length > 0 && (
        <SearchResultsAccordion
          title="Attachments"
          count={groupedResults.attachments.length}
          isOpen={openSections.attachments}
          onToggle={() => toggleSection('attachments')}
        >
          {groupedResults.attachments.map((filePath) => {
            const resultIndex = allResults.findIndex(
              (r) => r.type === 'attachment' && r.filePath.equals(filePath)
            );
            const pathToNote = filePath.getLinkToNote();

            return (
              <Link
                key={pathToNote}
                to={pathToNote}
                draggable={false}
                ref={(el) => {
                  if (resultIndex >= 0) {
                    itemRefs.current[resultIndex] = el;
                  }
                }}
                className={cn(
                  'flex flex-col gap-y-1 py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 focus-visible:outline-2 focus-visible:outline-sky-500 break-all',
                  resultIndex === selectedIndex &&
                    'bg-zinc-100 dark:bg-zinc-700'
                )}
              >
                <h3 className="font-semibold flex items-center gap-x-1.5">
                  {getFileIcon('image')} {filePath.note}
                </h3>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {filePath.toString()}
                </span>
              </Link>
            );
          })}
        </SearchResultsAccordion>
      )}

      {/* Folders Section */}
      {groupedResults.folders.length > 0 && (
        <SearchResultsAccordion
          title="Folders"
          count={groupedResults.folders.length}
          isOpen={openSections.folders}
          onToggle={() => toggleSection('folders')}
        >
          {groupedResults.folders.map((folder) => {
            const resultIndex = allResults.findIndex(
              (r) => r.type === 'folder' && r.folder === folder
            );
            const pathToFolder = `/notes/${folder}`;

            return (
              <Link
                key={pathToFolder}
                to={pathToFolder}
                draggable={false}
                ref={(el) => {
                  if (resultIndex >= 0) {
                    itemRefs.current[resultIndex] = el;
                  }
                }}
                className={cn(
                  'flex flex-col gap-y-1 py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 focus-visible:outline-2 focus-visible:outline-sky-500 break-all',
                  resultIndex === selectedIndex &&
                    'bg-zinc-100 dark:bg-zinc-700'
                )}
              >
                <h3 className="font-semibold flex items-center gap-x-1.5">
                  {getFileIcon('folder')} {folder}
                </h3>
              </Link>
            );
          })}
        </SearchResultsAccordion>
      )}
    </>
  );
}
