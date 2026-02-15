import { GroupedSearchResults } from '../../hooks/search';
import { FilePath, createFilePath } from '../../utils/path';

/**
 * Search results have sections for each type of result
 */
export type Section = 'notes' | 'attachments';

export type SearchRow =
  | {
      kind: 'header';
      title: Section;
      count: number;
      toggle: () => void;
    }
  | {
      kind: 'note';
      data: GroupedSearchResults['notes'][number];
      resultIndex: number;
    }
  | {
      kind: 'attachment';
      data: GroupedSearchResults['attachments'][number];
      resultIndex: number;
    };

/**
 * Returns a unique string key for each SearchRow item.
 * Useful for rendering lists in React with stable keys.
 *
 * @returns A unique key string for the given row.
 */
export function dataItemToKey(row: SearchRow): string {
  switch (row.kind) {
    case 'header':
      return `header-${row.title}`;
    case 'note':
      return `note-${row.data.filePath.toString()}`;
    case 'attachment':
      return `attachment-${row.data.filePath.toString()}`;
  }
}

/**
 * Returns a string representation suitable for searching/filtering for each SearchRow item.
 *
 * @returns A string useful for search/filtering in UI for the given row.
 */
export function dataItemToString(row: SearchRow): string {
  switch (row.kind) {
    case 'header':
      return row.title;
    case 'note':
      return row.data.filePath.note;
    case 'attachment':
      return row.data.filePath.note;
  }
}

/**
 * Builds a note/attachment href for the search page without using legacy `ext` query params.
 */
function buildSearchFileHref(
  filePath: FilePath,
  options?: { highlight?: string }
): string {
  if (!options?.highlight) {
    return filePath.encodedFileUrl;
  }
  const params = new URLSearchParams({ highlight: options.highlight });
  return `${filePath.encodedFileUrl}?${params.toString()}`;
}

/**
 * Parses a path string into FilePath and builds the corresponding search href.
 */
export function buildSearchFileHrefFromPath(
  filePath: string,
  options?: { highlight?: string }
): string {
  const parsedFilePath = createFilePath(filePath);
  if (!parsedFilePath) {
    return '/404';
  }
  return buildSearchFileHref(parsedFilePath, options);
}
