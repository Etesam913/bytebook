import { useMutation, useQuery } from '@tanstack/react-query';
import { atom, useSetAtom } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import {
  FullTextSearch,
  SearchFileNamesFromQuery,
} from '../../bindings/github.com/etesam913/bytebook/internal/services/searchservice';
import { searchPanelDataAtom } from '../atoms';
import { useWailsEvent } from '../hooks/events';
import { isEventInCurrentWindow } from '../utils/events';

export const lastSearchQueryAtom = atom<string>('');

export function useSearch() {
  const setSearchPanelData = useSetAtom(searchPanelDataAtom);

  useWailsEvent('search:open-panel', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    setSearchPanelData((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  });

  useWailsEvent('search:open', async (data) => {
    if (!(await isEventInCurrentWindow(data))) return;
    // Check if already on /search, if so, go back
    if (window.location.pathname.startsWith('/search')) {
      window.history.back();
    } else {
      navigate('/search');
    }
  });
}

export function useSearchMutation() {
  return useMutation({
    mutationFn: async ({ searchQuery }: { searchQuery: string }) => {
      return await SearchFileNamesFromQuery(searchQuery);
    },
    onError: () => {
      return [];
    },
  });
}

export function useFullTextSearchQuery(searchQuery: string) {
  return useQuery({
    queryKey: ['full-text-search', searchQuery],
    queryFn: () => FullTextSearch(searchQuery),
  });
}
