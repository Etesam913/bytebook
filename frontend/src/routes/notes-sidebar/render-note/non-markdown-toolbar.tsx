import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import {
  isFullscreenAtom,
  isNoteMaximizedAtom,
  projectSettingsAtom,
} from '../../../atoms';
import { MotionIconButton } from '../../../components/buttons';
import { MaximizeNoteButton } from '../../../components/buttons/maximize-note';
import { DropdownMenu } from '../../../components/dropdown/dropdown-menu';
import { Tooltip } from '../../../components/tooltip';
import {
  useMoveNoteToTrashMutation,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { useRenameFileDialog } from '../../../hooks/dialogs';
import { Finder } from '../../../icons/finder';
import { FilePen } from '../../../icons/file-pen';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { LocalFilePath } from '../../../utils/string-formatting';
import type { LegacyAnimationControls } from 'motion/react';

export function NonMarkdownToolbar({
  animationControls,
  folder,
  noteWithoutExtension,
  filePath,
}: {
  animationControls: LegacyAnimationControls;
  folder: string;
  noteWithoutExtension: string;
  filePath: LocalFilePath;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);

  const notePath = `${folder}/${filePath.note}`;
  const isPinned = projectSettings.pinnedNotes.has(notePath);

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveNoteToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const openRenameFileDialog = useRenameFileDialog();

  const items = [
    {
      value: isPinned ? 'unpin-note' : 'pin-note',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <PinTack2 className="min-w-5" />{' '}
          {isPinned ? 'Unpin Note' : 'Pin Note'}
        </span>
      ),
    },
    {
      value: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-5" height={20} width={20} /> Reveal In Finder
        </span>
      ),
    },
    {
      value: 'rename-file',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <FilePen className="min-w-5" height={17} width={17} /> Rename
        </span>
      ),
    },
    {
      value: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-5" /> Move to Trash
        </span>
      ),
    },
  ];

  return (
    <header
      className={cn(
        'flex items-center gap-1.5 border-b px-2 pb-1 pt-2.5 h-12 border-zinc-200 dark:border-b-zinc-700 whitespace-nowrap ml-[-4.5px]',
        isNoteMaximized && !isFullscreen && 'pl-23!'
      )}
    >
      <MaximizeNoteButton animationControls={animationControls} />
      <h1 className="text-sm text-ellipsis overflow-hidden">
        {folder}/{noteWithoutExtension}.{filePath.noteExtension}
      </h1>
      <DropdownMenu
        items={items}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        className="ml-auto flex flex-col"
        dropdownClassName="w-60 right-4 top-12"
        onChange={(item) => {
          switch (item.value) {
            case 'pin-note':
            case 'unpin-note': {
              const newProjectSettings: ProjectSettings = {
                ...projectSettings,
              };
              if (item.value === 'pin-note') {
                newProjectSettings.pinnedNotes.add(notePath);
              } else {
                newProjectSettings.pinnedNotes.delete(notePath);
              }
              updateProjectSettings({
                newProjectSettings,
              });
              break;
            }
            case 'reveal-in-finder': {
              revealInFinder({
                folder,
                selectionRange: new Set([`note:${filePath.note}`]),
              });
              break;
            }
            case 'rename-file': {
              openRenameFileDialog(filePath);
              break;
            }
            case 'move-to-trash': {
              moveToTrash({
                folder,
                selectionRange: new Set([`note:${filePath.note}`]),
              });
              break;
            }
          }
        }}
      >
        {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
          <Tooltip content="Note settings" placement="left">
            <MotionIconButton
              id={buttonId}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-controls={isOpen ? menuId : undefined}
              aria-label="Note settings menu"
              className={cn(!isFullscreen && 'rounded-tr-2xl')}
              {...getDefaultButtonVariants()}
            >
              <HorizontalDots />
            </MotionIconButton>
          </Tooltip>
        )}
      </DropdownMenu>
    </header>
  );
}
