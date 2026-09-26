import { createFilePath } from '@utils/path';
import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import type { Frontmatter } from '@/types';
import { activeNoteCommandsAtom } from '../atoms';
import { useNoteActions } from './note-actions';

export function useNotePaletteCommands({
  folder,
  note,
  frontmatter,
  isReady,
  openFind,
}: {
  folder: string;
  note: string;
  frontmatter: Frontmatter;
  isReady: boolean;
  openFind: () => void;
}) {
  const setCommands = useSetAtom(activeNoteCommandsAtom);
  const { isPinned, isTocVisible, handleAction } = useNoteActions({
    folder,
    note,
    frontmatter,
  });

  useEffect(() => {
    const path = createFilePath(`${folder}/${note}.md`);
    if (!isReady || !path) return;
    setCommands({
      path: path.fullPath,
      isPinned,
      isTocVisible,
      run: (command) => {
        switch (command) {
          case 'find-in-note':
            openFind();
            break;
          case 'rename-note': {
            const input = document.getElementById('note-title');
            if (input instanceof HTMLInputElement) {
              input.focus();
              input.select();
            }
            break;
          }
          case 'edit-tags':
          case 'pin-note':
          case 'unpin-note':
          case 'show-table-of-contents':
          case 'hide-table-of-contents':
          case 'open-in-new-window':
          case 'reveal-in-finder':
            handleAction(command);
        }
      },
    });
    return () => setCommands(null);
  }, [
    folder,
    note,
    isReady,
    isPinned,
    isTocVisible,
    handleAction,
    openFind,
    setCommands,
  ]);
}
