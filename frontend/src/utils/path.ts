/**
 * Safely decodes a URI component, handling cases where:
 * - The string is already decoded
 * - The string contains invalid percent sequences (e.g., "%%", "%?" from filenames)
 *
 * This is necessary because filenames can contain literal "%" characters, which when
 * partially decoded can cause URIError when decodeURIComponent encounters invalid sequences.
 */
export function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    // If decoding fails, the string is likely already decoded
    // or contains characters that look like percent-encoding but aren't
    return str;
  }
}

/** Splits a path into non-empty segments, collapsing consecutive slashes. */
export function splitPathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/**
 * Removes a single trailing slash (e.g. `"folder/"` → `"folder"`).
 * Folder paths carry a trailing slash in the @pierre/trees model, while the
 * backend, routes/URLs, and persisted formats are slashless. This converts at
 * those boundaries.
 */
export function stripTrailingSlash(path: string): string {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * Returns `path` rewritten through a rename, or null when unaffected. A
 * folder rename matches the folder itself and every descendant. Handles the
 * mixed slash conventions: rename sources/targets and `path` may or may not
 * carry a trailing folder slash, which is preserved in the result.
 */
export function remapPathThroughRename({
  path,
  oldPath,
  newPath,
  isFolder,
}: {
  path: string;
  oldPath: string;
  newPath: string;
  isFolder: boolean;
}): string | null {
  if (!oldPath || !newPath) return null;
  if (isFolder) {
    const strippedOldPath = stripTrailingSlash(oldPath);
    const strippedNewPath = stripTrailingSlash(newPath);
    const oldPrefix = `${strippedOldPath}/`;
    if (path === strippedOldPath) {
      return strippedNewPath;
    }
    if (path.startsWith(oldPrefix)) {
      return `${strippedNewPath}/${path.slice(oldPrefix.length)}`;
    }
    return null;
  }
  return path === oldPath ? newPath : null;
}

export type PathRename = { oldPath: string; newPath: string };

/** Returns `path` rewritten by the first matching rename in a watcher batch. */
export function remapPathThroughRenames({
  path,
  renames,
  isFolder,
}: {
  path: string;
  renames: readonly PathRename[];
  isFolder: boolean;
}): string | null {
  for (const { oldPath, newPath } of renames) {
    const remapped = remapPathThroughRename({
      path,
      oldPath,
      newPath,
      isFolder,
    });
    if (remapped) return remapped;
  }
  return null;
}

/**
 * Joins path pieces into a normalized slash-delimited path, skipping empty or
 * null pieces and collapsing repeated slashes.
 */
export function joinPath(...pieces: (string | null | undefined)[]): string {
  return pieces
    .flatMap((piece) => (piece ? splitPathSegments(piece) : []))
    .join('/');
}

/**
 * Replaces the last segment of a slash-delimited path with `newLastSegment`.
 * Preserves any leading empty segment (e.g. an absolute-style path) and a
 * trailing slash (a folder path keeps its folder marker).
 */
export function replaceLastPathSegment(
  path: string,
  newLastSegment: string
): string {
  const hadTrailingSlash = path.endsWith('/');
  const segments = stripTrailingSlash(path).split('/');
  if (segments.length === 0) return newLastSegment;
  segments[segments.length - 1] = newLastSegment;
  return segments.join('/') + (hadTrailingSlash ? '/' : '');
}

export interface FolderPath {
  type: 'folder';
  fullPath: string;
  folder: string;
  folderUrl: string;
  encodedPath: string;
  encodedFolderUrl: string;
  equals(other: FolderPath): boolean;
}

/** Represents a path to a file in the bytebook app */
export interface FilePath {
  type: 'file';
  fullPath: string;
  folder: string;
  note: string;
  extension: string;
  noteWithoutExtension: string;
  fileUrl: string;
  encodedPath: string;
  encodedFileUrl: string;
  equals(other: FilePath): boolean;
}

/** A path pointing to either a file or a folder in the bytebook app. */
export type FileOrFolderPath = FilePath | FolderPath;

/**
 * Creates a FilePath object from a string
 * Returns null if the filePath is not a file
 * Normalizes the input filePath by removing extra slashes.
 */
export function createFilePath(filePath: string): FilePath | null {
  // Normalize the path: remove repeated slashes, trim, remove trailing slash
  const normalizedPath = splitPathSegments(filePath).join('/');

  const lastSegment = normalizedPath.split('/').pop();

  // The filePath has to point to a file, not a folder
  if (!lastSegment || !lastSegment.includes('.')) {
    return null;
  }

  const folder = normalizedPath.split('/').slice(0, -1).join('/');
  const note = lastSegment;
  const extension = lastSegment.split('.').pop()?.toLowerCase();
  if (!note || !extension) {
    return null;
  }

  // Compute noteWithoutExtension by finding the last dot and taking everything before it
  const lastDotIndex = note.lastIndexOf('.');
  const noteWithoutExtension =
    lastDotIndex === -1 ? note : note.substring(0, lastDotIndex);
  const encodedPath = normalizedPath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  return {
    type: 'file',
    fullPath: normalizedPath,
    fileUrl: `/notes/${normalizedPath}`,
    encodedPath,
    encodedFileUrl: `/notes/${encodedPath}`,
    folder,
    note,
    extension,
    noteWithoutExtension,
    equals(other: FilePath) {
      return this.fullPath === other.fullPath;
    },
  };
}

/**
 * Creates a FolderPath object from a string
 * Returns null if the folderPath is not a valid folder path
 */
export function createFolderPath(folderPath: string): FolderPath | null {
  // Remove any trailing slashes for normalizing
  const normalizedPath = folderPath.replace(/\/+$/, '');

  // If the normalized path is empty, this is not a valid folder
  if (!normalizedPath) {
    return null;
  }

  const parts = normalizedPath.split('/');
  const folder = parts[parts.length - 1];

  // If the folder path points to a file (contains a dot in the last segment), it's not a folder
  if (folder.includes('.')) {
    return null;
  }

  const encodedPath = normalizedPath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  return {
    type: 'folder',
    // Folder paths carry a trailing slash (the @pierre/trees convention).
    // URLs and backend calls stay slashless — see stripTrailingSlash.
    fullPath: `${normalizedPath}/`,
    folder,
    folderUrl: `/notes/${normalizedPath}`,
    encodedPath: `${encodedPath}/`,
    encodedFolderUrl: `/notes/${encodedPath}`,
    equals(other: FolderPath) {
      return this.fullPath === other.fullPath;
    },
  };
}
