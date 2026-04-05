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
  encodedPath,
  pathDisplay,
  children,
}: {
  searchQuery: string;
  title: string;
  iconType: 'note' | 'attachment';
  isActive: boolean;
  encodedPath: string;
  pathDisplay: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      draggable={false}
      className={cn(
        'flex flex-col gap-y-0.5 py-1.5 px-2 w-full text-left hover:bg-zinc-100 dark:hover:bg-zinc-650 focus:outline-2 focus:outline-(--accent-color) focus:-outline-offset-2',
        isActive && 'bg-zinc-150! dark:bg-zinc-700! text-(--accent-color)'
      )}
      onClick={(e) => {
        e.currentTarget.focus();
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
}: {
  data: NoteSearchResult;
  searchQuery: string;
  isActive: boolean;
}) {
  const { filePath, highlights, lastUpdated } = data;
  const firstHighlight = highlights[0];

  return (
    <SearchSidebarItem
      searchQuery={searchQuery}
      title={filePath.noteWithoutExtension}
      iconType="note"
      isActive={isActive}
      encodedPath={filePath.encodedPath}
      pathDisplay={filePath.fullPath}
    >
      {firstHighlight && !firstHighlight.isCode && (
        <div
          className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 overflow-hidden"
          dangerouslySetInnerHTML={{ __html: firstHighlight.content }}
        />
      )}
      {lastUpdated && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatDate(lastUpdated, 'relative')}
        </span>
      )}
    </SearchSidebarItem>
  );
}

function SearchSidebarResultAttachment({
  data,
  searchQuery,
  isActive,
}: {
  data: AttachmentSearchResult;
  searchQuery: string;
  isActive: boolean;
}) {
  const { filePath } = data;

  return (
    <SearchSidebarItem
      searchQuery={searchQuery}
      title={filePath.note}
      iconType="attachment"
      isActive={isActive}
      encodedPath={filePath.encodedPath}
      pathDisplay={filePath.fullPath}
    />
  );
}

export function SearchSidebarResultItem({
  result,
  searchQuery,
  isActive,
}: {
  result: SearchResult;
  searchQuery: string;
  isActive: boolean;
}) {
  switch (result.type) {
    case 'note':
      return (
        <SearchSidebarResultNote
          data={result}
          searchQuery={searchQuery}
          isActive={isActive}
        />
      );
    case 'attachment':
      return (
        <SearchSidebarResultAttachment
          data={result}
          searchQuery={searchQuery}
          isActive={isActive}
        />
      );
  }
}
