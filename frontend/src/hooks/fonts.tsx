import { queryOptions, useQuery } from '@tanstack/react-query';
import { GetFontFamilies } from '@bindings/services/settingsservice';
import { queryKeys } from '@utils/query-keys';
import { QueryError } from '@utils/query';

const fontQueries = {
  families: queryOptions({
    queryKey: queryKeys.fontFamilies(),
    queryFn: async () => {
      const res = await GetFontFamilies();
      if (!res.success) throw new QueryError(res.message);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  }),
};

export function useFontFamiliesQuery() {
  return useQuery(fontQueries.families);
}
