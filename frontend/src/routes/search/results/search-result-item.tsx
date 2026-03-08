import { ReactNode } from 'react';
import { Link } from 'wouter';
import { cn, formatDate } from '../../../utils/string-formatting';
import { ImageIcon } from '../../../icons/image';
import { Note } from '../../../icons/page';
import {
  AttachmentSearchResult,
  NoteSearchResult,
} from '../../../hooks/search';
import { SearchHighlights } from './search-highlights';
import { Tag } from '../../../components/editor/bottom-bar/tag';
import { buildSearchFileHrefFromPath } from '../utils';

function getFileIcon(iconType: 'note' | 'attachment') {
  switch (iconType) {
    case 'note':
      return <Note className="min-w-5 w-5" />;
    case 'attachment':
      return <ImageIcon className="min-w-5 w-5" />;
  }
}

function SearchResultItem({
  to,
  title,
  iconType,
  resultIndex,
  selectedIndex,
  onRef,
  pathDisplay,
  children,
}: {
  to: string;
  title: string;
  iconType: 'note' | 'attachment';
  resultIndex: number;
  selectedIndex: number;
  onRef: (el: HTMLAnchorElement | null) => void;
  pathDisplay?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      to={to}
      draggable={false}
      ref={onRef}
      className={cn(
        'group flex flex-col gap-y-1 py-2 px-2 w-full hover:bg-zinc-100 dark:hover:bg-zinc-650 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-650 focus-visible:outline-2 focus-visible:outline-sky-500 break-all',
        resultIndex === selectedIndex && 'bg-zinc-150 dark:bg-zinc-700'
      )}
    >
      <h3 className="font-semibold flex items-center gap-x-1.5">
        {getFileIcon(iconType)} {title}
      </h3>
      {pathDisplay && (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {pathDisplay}
        </span>
      )}
      {children}
    </Link>
  );
}

export function SearchResultNote({
  data,
  resultIndex,
  selectedIndex,
  onRef,
}: {
  data: NoteSearchResult;
  resultIndex: number;
  selectedIndex: number;
  onRef: (el: HTMLAnchorElement | null) => void;
}) {
  const { filePath, tags, lastUpdated, created, highlights, codeContent } =
    data;
  let pathToNote = buildSearchFileHrefFromPath(filePath.fullPath);
  const firstHighlightedTerm = highlights[0]?.highlightedTerm;

  if (firstHighlightedTerm) {
    pathToNote = buildSearchFileHrefFromPath(filePath.fullPath, {
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
      onRef={onRef}
      pathDisplay={filePath.fullPath}
    >
      <SearchHighlights highlights={highlights} />
      {codeContent.length > 0 && (
        <pre className="font-code text-xs py-1 px-1.5 bg-zinc-100 dark:bg-zinc-700 max-h-48 border-2 border-zinc-200 dark:border-zinc-650 w-fit max-w-full rounded-md overflow-hidden text-ellipsis dark:group-hover:border-zinc-600 dark:group-hover:bg-zinc-600">
          {codeContent.join('\n')}
        </pre>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 text-xs">
          {tags.map((tagName, tagIdx) => (
            <Tag
              key={`${filePath.fullPath}-${tagIdx}`}
              tagName={tagName}
              className="group-hover:bg-zinc-150 dark:group-hover:bg-zinc-600"
            />
          ))}
        </div>
      )}
      <div className="flex gap-x-1 items-center justify-between text-xs">
        {lastUpdated && (
          <div className="text-zinc-500 dark:text-zinc-400">
            Updated {' ' + formatDate(lastUpdated, 'relative')}
          </div>
        )}
        {created && (
          <span className="text-zinc-500 dark:text-zinc-400">
            Created {' ' + formatDate(created, 'yyyy-mm-dd')}
          </span>
        )}
      </div>
    </SearchResultItem>
  );
}

export function SearchResultAttachment({
  data,
  resultIndex,
  selectedIndex,
  onRef,
}: {
  data: AttachmentSearchResult;
  resultIndex: number;
  selectedIndex: number;
  onRef: (el: HTMLAnchorElement | null) => void;
}) {
  const { filePath, tags } = data;
  const pathToNote = buildSearchFileHrefFromPath(filePath.fullPath);

  return (
    <SearchResultItem
      to={pathToNote}
      title={filePath.note}
      iconType="attachment"
      resultIndex={resultIndex}
      selectedIndex={selectedIndex}
      onRef={onRef}
      pathDisplay={filePath.fullPath}
    >
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 text-xs">
          {tags.map((tagName, tagIdx) => (
            <Tag
              key={`${filePath.fullPath}-${tagIdx}`}
              tagName={tagName}
              className="group-hover:bg-zinc-200 dark:group-hover:bg-zinc-600"
            />
          ))}
        </div>
      )}
    </SearchResultItem>
  );
}
