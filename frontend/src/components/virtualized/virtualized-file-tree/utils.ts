import type { FileOrFolder, FlattenedFileOrFolder } from './types';

/**
 * Transforms a hierarchical file tree structure into a flattened array suitable for
 * rendering in a virtualized list.
 *
 * This function performs a depth-first traversal of the file tree, converting nested
 * folders and files into a linear array. Each item in the resulting array includes a
 * `level` property indicating its nesting depth (0 for top-level items).
 *
 * Only children of open folders are included in the flattened output. Closed folders
 * appear as single entries without their children.
 *
 * @param data - Array of top-level FileOrFolder items to transform
 * @param fileOrFolderMap - Map of file/folder IDs to their corresponding FileOrFolder
 *   objects, used to look up children by ID during traversal
 * @returns A flattened array of FileOrFolder items with `level` properties, ready
 *   for virtualization
 *
 * @example
 * ```ts
 * const tree = [
 *   { id: '1', name: 'Folder', type: 'folder', isOpen: true, childrenIds: ['2', '3'], ... },
 * ];
 * const map = new Map([
 *   ['1', tree[0]],
 *   ['2', { id: '2', name: 'File', type: 'file', ... }],
 * ]);
 * const flattened = transformFileTreeForVirtualizedList(tree, map);
 * // Result: [
 * //   { id: '1', name: 'Folder', type: 'folder', level: 0, ... },
 * //   { id: '2', name: 'File', type: 'file', level: 1, ... },
 * // ]
 * ```
 */
export function transformFileTreeForVirtualizedList(
  data: FileOrFolder[],
  fileOrFolderMap: Map<string, FileOrFolder>
): FlattenedFileOrFolder[] {
  function transformAFileOrFolder(
    fileOrFolder: FileOrFolder,
    level: number
  ): FlattenedFileOrFolder[] {
    const updatedFileOrFolderData = fileOrFolderMap.get(fileOrFolder.id);
    if (!updatedFileOrFolderData) return [];

    const flattenedEntryForFileOrFolder: FlattenedFileOrFolder = {
      ...updatedFileOrFolderData,
      level,
    };

    switch (updatedFileOrFolderData.type) {
      case 'folder': {
        const allEntriesForFolder = [flattenedEntryForFileOrFolder];

        if (updatedFileOrFolderData.isOpen) {
          // If the folder is open, the flattened representation for the virtualized list
          // has to include the next level of children. That is why dfs is happening
          for (const childId of updatedFileOrFolderData.childrenIds) {
            const childFileOrFolder = fileOrFolderMap.get(childId);
            if (!childFileOrFolder) continue;
            const children = transformAFileOrFolder(
              childFileOrFolder,
              level + 1
            );
            for (const child of children) {
              allEntriesForFolder.push(child);
            }
          }
        }

        return allEntriesForFolder;
      }
      case 'file':
      default:
        return [flattenedEntryForFileOrFolder];
    }
  }
  return data.flatMap((fileOrFolder) =>
    transformAFileOrFolder(fileOrFolder, 0)
  );
}
