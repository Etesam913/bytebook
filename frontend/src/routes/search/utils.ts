import { GroupedSearchResults } from '../../hooks/search';

/**
 * Search results have sections for each type of result
 */
export type Section = 'notes' | 'attachments' | 'folders';

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
    }
  | {
      kind: 'folder';
      data: GroupedSearchResults['folders'][number];
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
    case 'folder':
      return `folder-${row.data.folder}`;
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
    case 'folder':
      return row.data.folder;
  }
}
