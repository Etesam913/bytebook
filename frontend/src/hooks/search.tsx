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
import { useEffect, useRef } from 'react';

export const lastSearchQueryAtom = atom<string>('');

/**
 * Hook to handle search panel open/close and navigation to the search page.
 * Listens for 'search:open-panel' and 'search:open' Wails events.
 * - 'search:open-panel': toggles the search panel's open state.
 * - 'search:open': navigates to the search page or goes back if already there.
 */
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

/**
 * Hook to perform a mutation for searching file names from a query string.
 * Uses react-query's useMutation.
 * @returns {UseMutationResult} The mutation object for triggering the search.
 */
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

/**
 * Hook to perform a full-text search query using react-query.
 * @param {string} searchQuery - The search query string.
 * @returns {UseQueryResult} The query result containing search data.
 */
export function useFullTextSearchQuery(searchQuery: string) {
  return useQuery({
    queryKey: ['full-text-search', searchQuery],
    queryFn: () => FullTextSearch(searchQuery),
  });
}

/**
 * Hook to provide a ref to an input element and focus it when "/" is pressed.
 * Ignores the shortcut if the event originates from an input or textarea.
 * @returns {React.RefObject<HTMLInputElement>} The input ref to attach to your input.
 */
export function useSearchFocus() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only focus if the "/" key is pressed and no modifier keys are held
      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Don't focus if the event is coming from an input field
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return inputRef;
}
