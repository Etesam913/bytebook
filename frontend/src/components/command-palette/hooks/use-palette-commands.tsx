import { useQueryClient } from '@tanstack/react-query';
import { useSavedSearchesQuery } from '@hooks/search';
import { queryKeys } from '@utils/query-keys';
import { treeFilterQueryAtom } from '@/atoms';
import { useAtomValue, useStore } from 'jotai';
import { activeNoteCommandsAtom } from '@components/editor/atoms';
import { useFilePathFromRoute } from '@hooks/routes';
import {
  useNoteExists,
  useOpenInNewWindowMutation,
  useRevealInFinderMutation,
} from '@hooks/notes';
import { useFilter } from 'react-aria-components/Autocomplete';
import { focusTreeFilterInputAtom, isFileMaximizedAtom } from '@/atoms';
import type { NotePaletteCommand, PaletteItem } from '@/types';
import { useOpenSettingsDialog } from '@hooks/dialogs';

export function usePaletteCommands(query: string, onCreateNote: () => void) {
  const store = useStore();
  const queryClient = useQueryClient();
  const filePath = useFilePathFromRoute();
  const noteExists = useNoteExists(filePath);
  const activeNote = useAtomValue(activeNoteCommandsAtom);
  const { mutate: openInNewWindow } = useOpenInNewWindowMutation();
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const isFileReady =
    !!filePath && noteExists.data === true && !noteExists.isError;
  const isNoteReady = isFileReady && activeNote?.path === filePath.fullPath;
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
  const noteCommands: NotePaletteCommand[] = [
    {
      id: 'open-in-new-window',
      label: 'Open in New Window',
      keywords: 'separate window detach',
    },
    {
      id: 'find-in-note',
      label: 'Find in Note',
      keywords: 'search text content',
      shortcut: '⌘F',
    },
    { id: 'rename-note', label: 'Rename Note…', keywords: 'title name' },
    { id: 'edit-tags', label: 'Edit Tags…', keywords: 'labels metadata' },
    {
      id: isNoteReady && activeNote.isPinned ? 'unpin-note' : 'pin-note',
      label: isNoteReady && activeNote.isPinned ? 'Unpin Note' : 'Pin Note',
      keywords: 'favorite bookmark',
    },
    {
      id:
        isNoteReady && activeNote.isTocVisible
          ? 'hide-table-of-contents'
          : 'show-table-of-contents',
      label:
        isNoteReady && activeNote.isTocVisible
          ? 'Hide Table of Contents'
          : 'Show Table of Contents',
      keywords: 'outline headings toc',
    },
    {
      id: 'reveal-in-finder',
      label: 'Reveal in Finder',
      keywords: 'file location disk',
    },
  ];
  const noteItems: PaletteItem[] = noteCommands
    .filter((command) =>
      contains(`${command.label} ${command.keywords}`, query)
    )
    .map((command) => {
      const isFileCommand =
        command.id === 'reveal-in-finder' ||
        command.id === 'open-in-new-window';
      const isEnabled = isFileCommand ? isFileReady : isNoteReady;
      return {
        id: command.id,
        label: command.label,
        isDisabled: !isEnabled,
        description: isEnabled
          ? (command.shortcut ?? '')
          : isFileCommand
            ? 'Open a note or attachment first'
            : filePath?.extension === 'md'
              ? 'Note is loading…'
              : 'Open a note first',
        action: {
          kind: 'command',
          run: () => {
            if (!isEnabled) return;
            if (isFileCommand && filePath) {
              if (command.id === 'open-in-new-window') {
                openInNewWindow({ path: filePath });
              } else {
                revealInFinder({ path: filePath });
              }
              return;
            }
            // Resolve after the palette closes so an unmounted editor cannot run an action.
            const current = store.get(activeNoteCommandsAtom);
            if (current?.path === filePath?.fullPath) current?.run(command.id);
          },
        },
      };
    });
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
  return { items, noteItems, savedItems, savedSearches };
}
