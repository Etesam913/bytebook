import { useQueryClient } from '@tanstack/react-query';
import { useSavedSearchesQuery } from '@hooks/search';
import { queryKeys } from '@utils/query-keys';
import { treeFilterQueryAtom } from '@/atoms';
import { useStore } from 'jotai';
import { useFilter } from 'react-aria-components/Autocomplete';
import { focusTreeFilterInputAtom, isFileMaximizedAtom } from '@/atoms';
import type { PaletteItem } from '@/types';
import { useOpenSettingsDialog } from '@hooks/dialogs';

export function usePaletteCommands(query: string, onCreateNote: () => void) {
  const store = useStore();
  const queryClient = useQueryClient();
  const savedSearches = useSavedSearchesQuery();
  const openSettings = useOpenSettingsDialog();
  const { contains } = useFilter({ sensitivity: 'base' });
  const commands = [
    {
      id: 'new-note',
      label: 'New Note…',
      keywords: 'create markdown',
      shortcut: '',
      run: onCreateNote,
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      keywords: 'preferences appearance',
      shortcut: '⌘,',
      run: openSettings,
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      keywords: 'focus maximize',
      shortcut: '⌘S',
      run: () => store.set(isFileMaximizedAtom, (value) => !value),
    },
    {
      id: 'search-all-notes',
      label: 'Search All Notes',
      keywords: 'find content filter',
      shortcut: '⇧⌘F',
      run: () => {
        store.set(isFileMaximizedAtom, false);
        store.set(focusTreeFilterInputAtom);
      },
    },
    {
      id: 'go-back',
      label: 'Go Back',
      keywords: 'history previous',
      shortcut: '⌘[',
      run: () => window.history.back(),
    },
    {
      id: 'go-forward',
      label: 'Go Forward',
      keywords: 'history next',
      shortcut: '⌘]',
      run: () => window.history.forward(),
    },
  ];
  const items: PaletteItem[] = commands
    .filter((command) =>
      contains(`${command.label} ${command.keywords}`, query)
    )
    .map((command) => ({
      id: command.id,
      label: command.label,
      description: command.shortcut,
      action:
        command.id === 'new-note'
          ? { kind: 'create-note' }
          : { kind: 'command', run: command.run },
    }));
  const savedItems: PaletteItem[] = (savedSearches.data ?? [])
    .filter((search) => contains(`${search.name} ${search.query}`, query))
    .map((search) => ({
      id: `saved-search:${search.name}`,
      label: `Open saved search: ${search.name}`,
      description: search.query,
      action: {
        kind: 'command',
        run: () => {
          // Resolve at activation so updates or deletions cannot run stale queries.
          const current = queryClient
            .getQueryData<typeof savedSearches.data>(queryKeys.savedSearches())
            ?.find((item) => item.name === search.name);
          if (!current) return;
          store.set(treeFilterQueryAtom, current.query);
          store.set(isFileMaximizedAtom, false);
          store.set(focusTreeFilterInputAtom);
        },
      },
    }));
  return { items, savedItems, savedSearches };
}
