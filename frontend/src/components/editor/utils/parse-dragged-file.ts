import {
  createFilePath,
  createFolderPath,
  safeDecodeURIComponent,
  type FilePath,
} from '@utils/path';
import { WAILS_URL } from '@utils/general';

/**
 * Parses a dragged file URL and extracts its type and metadata
 */
type DraggedFileResult =
  | { type: 'folder'; url: string; title: string }
  | { type: 'markdown'; url: string; title: string }
  | { type: 'file'; filePath: FilePath }
  | { type: 'unknown' };

export function parseDraggedFile(fileUrl: string): DraggedFileResult {
  if (!fileUrl.startsWith(WAILS_URL)) {
    return { type: 'unknown' };
  }

  // Trailing slash = folder (set explicitly by the file-tree drag helper);
  // otherwise treat as file. Avoids guessing from a dot, which is wrong for
  // dotted folder names (`v1.0`) and extensionless files (`Makefile`).
  const isFolder = fileUrl.endsWith('/');

  // Strip `wails:` then optional `/notes/` prefix and trailing slash.
  let rawPath = safeDecodeURIComponent(fileUrl.slice(WAILS_URL.length));
  if (rawPath.startsWith('/notes/')) {
    rawPath = rawPath.slice('/notes/'.length);
  }
  if (rawPath.endsWith('/')) {
    rawPath = rawPath.slice(0, -1);
  }

  if (isFolder) {
    const folderPath = createFolderPath(rawPath);
    if (!folderPath) {
      return { type: 'unknown' };
    }
    return {
      type: 'folder',
      url: `${WAILS_URL}${folderPath.encodedFolderUrl}`,
      title: folderPath.folder,
    };
  }

  const filePath = createFilePath(rawPath);
  if (!filePath) {
    return { type: 'unknown' };
  }

  if (filePath.extension === 'md') {
    return {
      type: 'markdown',
      url: `${WAILS_URL}${filePath.encodedFileUrl}`,
      title: filePath.noteWithoutExtension,
    };
  }

  return { type: 'file', filePath };
}
