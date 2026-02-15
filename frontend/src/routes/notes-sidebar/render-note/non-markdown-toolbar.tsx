import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import {
  isFullscreenAtom,
  isNoteMaximizedAtom,
  projectSettingsAtom,
} from '../../../atoms';
import { currentZoomAtom } from '../../../hooks/resize';
import { MotionIconButton } from '../../../components/buttons';
import { MaximizeNoteButton } from '../../../components/buttons/maximize-note';
import { DropdownMenu } from '../../../components/dropdown/dropdown-menu';
import { Tooltip } from '../../../components/tooltip';
import {
  useMoveNoteToTrashMutation,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { Finder } from '../../../icons/finder';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { FilePath } from '../../../utils/path';
import type { LegacyAnimationControls } from 'motion/react';
import { useToggleSidebarEvent } from './hooks';

export function NonMarkdownToolbar({
  animationControls,
  filePath,
}: {
  animationControls: LegacyAnimationControls;
  filePath: FilePath;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const currentZoom = useAtomValue(currentZoomAtom);
  const isPinned = projectSettings.pinnedNotes.has(filePath.fullPath);

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveNoteToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  useToggleSidebarEvent(animationControls);

  const items = [
    {
      value: isPinned ? 'unpin-note' : 'pin-note',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <PinTack2 className="min-w-4" height={16} width={16} />{' '}
          {isPinned ? 'Unpin Note' : 'Pin Note'}
        </span>
      ),
    },
    {
      value: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-4" height={16} width={16} /> Reveal In Finder
        </span>
      ),
    },
    {
      value: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-4" height={16} width={16} /> Move to Trash
        </span>
      ),
    },
  ];

  return (
    <header
      className={cn(
        'flex items-center gap-1.5 border-b pr-2 pb-1 pt-2.5 h-12 border-zinc-200 dark:border-b-zinc-700 whitespace-nowrap pl-3 text-sm',
        isNoteMaximized && !isFullscreen && 'pl-23! w-full'
      )}
      style={
        !(isNoteMaximized && !isFullscreen)
          ? { width: `calc(100vw - (${currentZoom} * 22rem))` }
          : undefined
      }
    >
      <MaximizeNoteButton animationControls={animationControls} />
      <Tooltip content={filePath.fullPath} placement="bottom">
        <h1 className="truncate">{filePath.fullPath}</h1>
      </Tooltip>
      <DropdownMenu
        items={items}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        className="flex flex-col ml-auto"
        dropdownClassName="w-40 right-4 top-12"
        onChange={(item) => {
          switch (item.value) {
            case 'pin-note':
            case 'unpin-note': {
              const newProjectSettings: ProjectSettings = {
                ...projectSettings,
              };
              if (item.value === 'pin-note') {
                newProjectSettings.pinnedNotes.add(filePath.fullPath);
              } else {
                newProjectSettings.pinnedNotes.delete(filePath.fullPath);
              }
              updateProjectSettings({
                newProjectSettings,
              });
              break;
            }
            case 'reveal-in-finder': {
              revealInFinder({
                folder: filePath.folder,
                selectionRange: new Set([`note:${filePath.note}`]),
              });
              break;
            }
            case 'move-to-trash': {
              moveToTrash({
                folder: filePath.folder,
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
