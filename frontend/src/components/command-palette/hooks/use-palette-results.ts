import { useAtomValue } from 'jotai';
import { mostRecentItemsAtom } from '@/atoms';
import type { PaletteItem } from '@/types';
import { useAllPaths } from '@hooks/all-paths';
import { useFilePathFromRoute } from '@hooks/routes';
import { useFileSearchQuery } from '@hooks/search';
import { type FileOrFolderPath } from '@utils/path';
import { getRecentPickerFiles } from '@utils/file-picker-results';

export function usePaletteResults(query: string, enabled: boolean) {
  const recent = useAtomValue(mostRecentItemsAtom);
  const { data: allPaths } = useAllPaths();
  const current = useFilePathFromRoute();
  const search = useFileSearchQuery({
    query,
    enabled,
    keepPreviousResults: true,
    limit: 100,
    includeFolders: true,
  });
  const files: { path: FileOrFolderPath; excerpt?: string }[] =
    query.trim() && (search.data || !search.isSearching)
      ? (search.data?.results ?? [])
        .map((result) => ({
          path:
            result.type === 'folder' ? result.folderPath : result.filePath,
          excerpt:
            result.type === 'note'
              ? result.highlights[0]?.content
              : undefined,
        }))
      : getRecentPickerFiles({
        recent,
        currentPath: current?.fullPath,
        allPaths,
      }).map((filePath) => ({ path: filePath, excerpt: undefined }));

  const items: PaletteItem[] = files.map((result) => ({
    id: result.path.fullPath,
    label:
      result.path.type === 'folder' ? result.path.folder : result.path.note,
    description:
      result.path.type === 'folder'
        ? result.path.fullPath
        : result.path.folder || 'Notes',
    action: { kind: 'open-path', path: result.path },
    excerpt: result.excerpt,
  }));
  return { items, search };
}
