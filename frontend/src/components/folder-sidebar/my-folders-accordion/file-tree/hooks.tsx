import { useQuery } from '@tanstack/react-query';

export function useFileForFolder({
  folderId,
  isExpanded,
}: {
  folderId: string;
  isExpanded: boolean;
}) {
  return useQuery({
    enabled: isExpanded,
    queryKey: ['folder', folderId],
    queryFn: () => {
      return [];
    },
  });
}
