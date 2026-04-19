import { useQuery } from '@tanstack/react-query';
import { GetLinkedMentions } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/searchservice';
import type { FilePath } from '../../../utils/path';

const LINKED_MENTIONS_PAGE_SIZE = 100;

export function useLinkedMentionsQuery(filePath: FilePath) {
  const pathToNote = filePath.fullPath;

  return useQuery({
    queryKey: ['linked-mentions', pathToNote],
    queryFn: async () => {
      const res = await GetLinkedMentions(
        pathToNote,
        LINKED_MENTIONS_PAGE_SIZE
      );
      return (res.data ?? []).filter(
        (mention) =>
          `${mention.folder ? `${mention.folder}/` : ''}${mention.note}` !==
          filePath.fullPath
      );
    },
    refetchInterval: 3000,
  });
}
