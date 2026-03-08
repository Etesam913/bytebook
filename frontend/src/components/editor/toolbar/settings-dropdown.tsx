import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import {
  dialogDataAtom,
  isFullscreenAtom,
  projectSettingsAtom,
} from '../../../atoms';
import {
  useMoveToTrashMutation,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { useEditTagsFormMutation } from '../../../hooks/tags';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { EditTagDialogChildren } from '../../../routes/notes-sidebar/edit-tag-dialog-children';
import { Finder } from '../../../icons/finder';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { TagPlus } from '../../../icons/tag-plus';
import { Table } from '../../../icons/table';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';
import { MotionIconButton } from '../../buttons';
import { DropdownMenu } from '../../dropdown/dropdown-menu';
import { SAVE_MARKDOWN_CONTENT } from '../plugins/save';
import type { Frontmatter } from '../../../types';
import { Tooltip } from '../../tooltip';
import { cn } from '../../../utils/string-formatting';

export function SettingsDropdown({
  folder,
  note,
  isToolbarDisabled,
  frontmatter,
}: {
  folder: string;
  note: string;
  isToolbarDisabled: boolean;
  frontmatter: Frontmatter;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isPinned = projectSettings.pinnedNotes.has(`${folder}/${note}.md`);
  const setDialogData = useSetAtom(dialogDataAtom);
  const [editor] = useLexicalComposerContext();

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();

  const items = [
    {
      value: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-5" height={18} width={18} /> Reveal In Finder
        </span>
      ),
    },
    {
      value: isPinned ? 'unpin-note' : 'pin-note',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <PinTack2 className="min-w-5" height={18} width={18} />{' '}
          {isPinned ? 'Unpin Note' : 'Pin Note'}
        </span>
      ),
    },
    {
      value: 'edit-tags',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <TagPlus className="min-w-5" height={18} width={18} /> Edit Tags
        </span>
      ),
    },
    {
      value:
        frontmatter.showTableOfContents === 'true'
          ? 'hide-table-of-contents'
          : 'show-table-of-contents',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Table className="min-w-5" height={18} width={18} />{' '}
          {frontmatter.showTableOfContents === 'true'
            ? 'Hide Table of Contents'
            : 'Show Table of Contents'}
        </span>
      ),
    },
    {
      value: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-5" height={18} width={18} /> Move to Trash
        </span>
      ),
    },
  ];

  return (
    <DropdownMenu
      items={items}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      className="ml-auto flex flex-col"
      dropdownClassName="w-52 right-4 top-12"
      onChange={async (item) => {
        switch (item.value) {
          case 'pin-note':
          case 'unpin-note': {
            const newProjectSettings: ProjectSettings = {
              ...projectSettings,
            };
            if (item.value === 'pin-note') {
              newProjectSettings.pinnedNotes.add(`${folder}/${note}.md`);
            } else {
              newProjectSettings.pinnedNotes.delete(`${folder}/${note}.md`);
            }
            updateProjectSettings({
              newProjectSettings,
            });

            break;
          }
          case 'show-table-of-contents':
          case 'hide-table-of-contents': {
            const copyOfFrontmatter = { ...frontmatter };
            copyOfFrontmatter.showTableOfContents =
              item.value === 'show-table-of-contents' ? 'true' : 'false';

            editor.update(() => {
              editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, {
                newFrontmatter: copyOfFrontmatter,
              });
            });
            break;
          }
          case 'reveal-in-finder': {
            revealInFinder({
              selectionRange: new Set([`note:${note}.md`]),
              folder,
            });
            break;
          }
          case 'edit-tags': {
            const selectionRange = new Set([`note:${note}.md`]);
            setDialogData({
              isOpen: true,
              isPending: false,
              title: 'Edit Tags',
              dialogClassName: 'w-[min(30rem,90vw)]',
              children: (errorText) => (
                <EditTagDialogChildren
                  selectionRange={selectionRange}
                  folder={folder}
                  errorText={errorText}
                />
              ),
              onSubmit: async (e, setErrorText) => {
                return await editTags({
                  e,
                  setErrorText,
                  selectionRange,
                  folder,
                });
              },
            });
            break;
          }
          case 'move-to-trash': {
            moveToTrash({ paths: [`${folder}/${note}.md`] });
            break;
          }
        }
      }}
    >
      {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
        <Tooltip content="Note settings" placement="left" delay={{ open: 50 }}>
          <MotionIconButton
            id={buttonId}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? menuId : undefined}
            aria-label="Note settings menu"
            className={cn(
              !isFullscreen && 'rounded-tr-2xl',
              isOpen && 'bg-zinc-100 dark:bg-zinc-700'
            )}
            {...getDefaultButtonVariants({ disabled: isToolbarDisabled })}
          >
            <HorizontalDots />
          </MotionIconButton>
        </Tooltip>
      )}
    </DropdownMenu>
  );
}
