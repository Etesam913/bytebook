import { queryOptions, useQuery } from '@tanstack/react-query';
import { GetFontFamilies } from '@bindings/services/settingsservice';
import { queryKeys } from '@utils/query-keys';
import { getBackendResponseData } from '@utils/query';

const fontQueries = {
  families: queryOptions({
    queryKey: queryKeys.fontFamilies(),
    queryFn: async () => {
      return (await getBackendResponseData(GetFontFamilies())) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  }),
};

export function useFontFamiliesQuery() {
  return useQuery(fontQueries.families);
}
