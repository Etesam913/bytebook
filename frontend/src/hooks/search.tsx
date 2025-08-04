import { useMutation } from '@tanstack/react-query';
import { Window } from '@wailsio/runtime';
import { atom, useSetAtom } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import { SearchFileNamesFromQuery } from '../../bindings/github.com/etesam913/bytebook/internal/services/searchservice';
import { searchPanelDataAtom } from '../atoms';
import { useWailsEvent } from '../hooks/events';

export const lastSearchQueryAtom = atom<string>('');

export function useSearch() {
  const setSearchPanelData = useSetAtom(searchPanelDataAtom);

  useWailsEvent('search:open-panel', async (data) => {
    const windowName = await Window.Name();
    if (windowName !== data.sender) return;
    setSearchPanelData((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  });

  useWailsEvent('search:open', async (data) => {
    const windowName = await Window.Name();
    if (windowName !== data.sender) return;
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
