import { useStore } from 'jotai';
import { useFilter } from 'react-aria-components/Autocomplete';
import { focusTreeFilterInputAtom, isFileMaximizedAtom } from '@/atoms';
import type { PaletteItem } from '@/types';
import { useOpenSettingsDialog } from '@hooks/dialogs';

export function usePaletteCommands(
  query: string,
  onCreateNote: () => void
): PaletteItem[] {
  const store = useStore();
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
  return commands
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
}
