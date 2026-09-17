import type { FileOrFolderPath, FilePath } from '@utils/path';

// Both pickers omit the current document without changing the source order.
export function getRecentPickerFiles({
  recent,
  currentPath,
  allPaths,
}: {
  recent: readonly FileOrFolderPath[];
  currentPath: string | undefined;
  allPaths: readonly string[] | undefined;
}): FilePath[] {
  const existing = allPaths ? new Set(allPaths) : null;
  return recent.filter(
    (item): item is FilePath =>
      item.type === 'file' &&
      item.fullPath !== currentPath &&
      (!existing || existing.has(item.fullPath))
  );
}

export function excludeCurrentFile<T extends { filePath: FilePath }>(
  results: readonly T[],
  currentPath: string | undefined
): T[] {
  return results.filter((result) => result.filePath.fullPath !== currentPath);
}
