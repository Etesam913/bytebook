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

/**
 * Creates a FilePath object from a string
 * Returns null if the filePath is not a file
 * Normalizes the input filePath by removing extra slashes.
 */
export function createFilePath(filePath: string): FilePath | null {
  // Normalize the path: remove repeated slashes, trim, remove trailing slash
  const normalizedPath = filePath.split('/').filter(Boolean).join('/');

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
    fullPath: normalizedPath,
    folder,
    folderUrl: `/notes/${normalizedPath}`,
    encodedPath,
    encodedFolderUrl: `/notes/${encodedPath}`,
    equals(other: FolderPath) {
      return this.fullPath === other.fullPath;
    },
  };
}
