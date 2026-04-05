import { SearchResult } from '../../hooks/search';

/**
 * Returns a unique string key for each search result item.
 */
export function dataItemToKey(result: SearchResult): string {
  return `${result.type}-${result.filePath.fullPath}`;
}

/**
 * Returns a string representation suitable for searching/filtering.
 */
export function dataItemToString(result: SearchResult): string {
  return result.filePath.note;
}
