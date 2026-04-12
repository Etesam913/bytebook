import { navigate } from 'wouter/use-browser-location';
import { cn, formatDate } from '../../../utils/string-formatting';
import { ImageIcon } from '../../../icons/image';
import { Note } from '../../../icons/page';
import {
  type AttachmentSearchResult,
  type NoteSearchResult,
  type SearchResult,
} from '../../../hooks/search';
import { routeUrls } from '../../../utils/routes';
import { Tag } from '../../editor/bottom-bar/tag';

function SearchResultTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1 text-xs text-zinc-950 dark:text-zinc-100">
      {tags.map((tagName) => (
        <Tag key={tagName} tagName={tagName} />
      ))}
    </div>
  );
}

function getFileIcon(iconType: 'note' | 'attachment') {
  switch (iconType) {
    case 'note':
      return <Note className="shrink-0" width="1rem" height="1rem" />;
    case 'attachment':
      return <ImageIcon className="shrink-0" width="1rem" height="1rem" />;
  }
}

function SearchSidebarItem({
  searchQuery,
  title,
  iconType,
  isActive,
  isHighlighted,
  encodedPath,
  pathDisplay,
  children,
}: {
  searchQuery: string;
  title: string;
  iconType: 'note' | 'attachment';
  isActive: boolean;
  isHighlighted: boolean;
  encodedPath: string;
  pathDisplay: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      draggable={false}
      className={cn(
        'flex flex-col gap-y-0.5 py-1.5 px-2 w-full text-left hover:bg-zinc-100 dark:hover:bg-zinc-650',
        isActive &&
          'bg-zinc-150! dark:bg-zinc-700! text-(--accent-color) outline-2 outline-(--accent-color) -outline-offset-2',
        isHighlighted && !isActive && 'bg-zinc-100 dark:bg-zinc-650'
      )}
      onMouseDown={(e) => {
        // Prevent the button from stealing focus from the search input so
        // that arrow-key navigation (handled on the input) keeps working.
        e.preventDefault();
      }}
      onClick={() => {
        navigate(routeUrls.search(searchQuery, encodedPath));
      }}
    >
      <h3 className="font-semibold text-sm flex items-center gap-x-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
        {getFileIcon(iconType)} <span className="truncate">{title}</span>
      </h3>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate w-full">
        {pathDisplay}
      </span>
      {children}
    </button>
  );
}

function SearchSidebarResultNote({
  data,
  searchQuery,
  isActive,
  isHighlighted,
}: {
  data: NoteSearchResult;
  searchQuery: string;
  isActive: boolean;
  isHighlighted: boolean;
}) {
  const { filePath, highlights, lastUpdated, tags } = data;
  const firstHighlight = highlights[0];

  return (
    <SearchSidebarItem
      searchQuery={searchQuery}
      title={filePath.noteWithoutExtension}
      iconType="note"
      isActive={isActive}
      isHighlighted={isHighlighted}
      encodedPath={filePath.encodedPath}
      pathDisplay={filePath.fullPath}
    >
      {firstHighlight && !firstHighlight.isCode && (
        <div
          className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2"
          dangerouslySetInnerHTML={{ __html: firstHighlight.content }}
        />
      )}
      {lastUpdated && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatDate(lastUpdated, 'relative')}
        </span>
      )}
      <SearchResultTags tags={tags} />
    </SearchSidebarItem>
  );
}

function SearchSidebarResultAttachment({
  data,
  searchQuery,
  isActive,
  isHighlighted,
}: {
  data: AttachmentSearchResult;
  searchQuery: string;
  isActive: boolean;
  isHighlighted: boolean;
}) {
  const { filePath, tags } = data;

  return (
    <SearchSidebarItem
      searchQuery={searchQuery}
      title={filePath.note}
      iconType="attachment"
      isActive={isActive}
      isHighlighted={isHighlighted}
      encodedPath={filePath.encodedPath}
      pathDisplay={filePath.fullPath}
    >
      <SearchResultTags tags={tags} />
    </SearchSidebarItem>
  );
}

export function SearchSidebarResultItem({
  result,
  searchQuery,
  isActive,
  isHighlighted,
}: {
  result: SearchResult;
  searchQuery: string;
  isActive: boolean;
  isHighlighted: boolean;
}) {
  switch (result.type) {
    case 'note':
      return (
        <SearchSidebarResultNote
          data={result}
          searchQuery={searchQuery}
          isActive={isActive}
          isHighlighted={isHighlighted}
        />
      );
    case 'attachment':
      return (
        <SearchSidebarResultAttachment
          data={result}
          searchQuery={searchQuery}
          isActive={isActive}
          isHighlighted={isHighlighted}
        />
      );
  }
}
