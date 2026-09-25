import { useAtomValue } from 'jotai';
import { mostRecentItemsAtom } from '@/atoms';
import type { PaletteItem } from '@/types';
import { useAllPaths } from '@hooks/all-paths';
import { useFilePathFromRoute } from '@hooks/routes';
import { useFileSearchQuery } from '@hooks/search';
import {
  excludeCurrentFile,
  getRecentPickerFiles,
} from '@utils/file-picker-results';

export function usePaletteResults(query: string, enabled: boolean) {
  const recent = useAtomValue(mostRecentItemsAtom);
  const { data: allPaths } = useAllPaths();
  const current = useFilePathFromRoute();
  const search = useFileSearchQuery({
    query,
    enabled,
    keepPreviousResults: true,
    limit: 100,
  });
  const files =
    query.trim() && (search.data || !search.isSearching)
      ? excludeCurrentFile(search.data?.results ?? [], current?.fullPath).map(
          (result) => ({
            filePath: result.filePath,
            excerpt:
              result.type === 'note'
                ? result.highlights[0]?.content
                : undefined,
          })
        )
      : getRecentPickerFiles({
          recent,
          currentPath: current?.fullPath,
          allPaths,
        }).map((filePath) => ({ filePath, excerpt: undefined }));

  const items: PaletteItem[] = files.map((result) => ({
    id: result.filePath.fullPath,
    label: result.filePath.note,
    description: result.filePath.folder || 'Notes',
    action: { kind: 'open-path', path: result.filePath },
    excerpt: result.excerpt,
  }));
  return { items, search };
}
