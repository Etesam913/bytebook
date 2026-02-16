import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import {
  dialogDataAtom,
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
import { useEditTagsFormMutation } from '../../../hooks/tags';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { EditTagDialogChildren } from '../edit-tag-dialog-children';
import { Finder } from '../../../icons/finder';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { TagPlus } from '../../../icons/tag-plus';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';
import { cn } from '../../../utils/string-formatting';
import { FilePath } from '../../../utils/path';
import type { LegacyAnimationControls } from 'motion/react';
import { useToggleSidebarEvent } from './hooks';
import { MediaMetadata } from '../../../components/note-renderer/media-metadata';

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
  const setDialogData = useSetAtom(dialogDataAtom);

  const isPinned = projectSettings.pinnedNotes.has(filePath.fullPath);

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveNoteToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();
  useToggleSidebarEvent(animationControls);

  const items = [
    {
      value: isPinned ? 'unpin-note' : 'pin-note',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <PinTack2 className="min-w-4.5" height={18} width={18} />{' '}
          {isPinned ? 'Unpin Note' : 'Pin Note'}
        </span>
      ),
    },
    {
      value: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-4.5" height={18} width={18} /> Reveal In
          Finder
        </span>
      ),
    },
    {
      value: 'edit-tags',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <TagPlus className="min-w-4.5" height={18} width={18} /> Edit Tags
        </span>
      ),
    },
    {
      value: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-4.5" height={18} width={18} /> Move to Trash
        </span>
      ),
    },
  ];

  return (
    <header
      className={cn(
        'flex w-full min-w-0 items-center gap-3 border-b pr-2 pb-2 pt-3.75 h-12 border-zinc-200 dark:border-b-zinc-700 whitespace-nowrap text-xs',
        isNoteMaximized && !isFullscreen && 'pl-23!'
      )}
    >
      <MaximizeNoteButton animationControls={animationControls} />
      <MediaMetadata filePath={filePath} />
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
            case 'edit-tags': {
              const selectionRange = new Set([`note:${filePath.note}`]);
              setDialogData({
                isOpen: true,
                isPending: false,
                title: 'Edit Tags',
                dialogClassName: 'w-[min(30rem,90vw)]',
                children: (errorText) => (
                  <EditTagDialogChildren
                    selectionRange={selectionRange}
                    folder={filePath.folder}
                    errorText={errorText}
                  />
                ),
                onSubmit: async (e, setErrorText) => {
                  return await editTags({
                    e,
                    setErrorText,
                    selectionRange,
                    folder: filePath.folder,
                  });
                },
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
