import { SearchResult } from '../../hooks/search';
import { FilePath, createFilePath } from '../../utils/path';

/**
 * Returns a unique string key for each search result item.
 */
export function dataItemToKey(result: SearchResult): string {
  if (result.type === 'folder') {
    return `folder-${result.folderPath.fullPath}`;
  }
  return `${result.type}-${result.filePath.fullPath}`;
}

/**
 * Returns a string representation suitable for searching/filtering.
 */
export function dataItemToString(result: SearchResult): string {
  if (result.type === 'folder') {
    return result.folderPath.folder;
  }
  return result.filePath.note;
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
