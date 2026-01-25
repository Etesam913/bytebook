import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import { isFullscreenAtom, projectSettingsAtom } from '../../../atoms';
import {
  useMoveNoteToTrashMutation,
  useMoveToTrashMutationNew,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { useRenameFileDialog } from '../../../hooks/dialogs';
import { Finder } from '../../../icons/finder';
import { FilePen } from '../../../icons/file-pen';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { Table } from '../../../icons/table';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';
import { MotionIconButton } from '../../buttons';
import { DropdownMenu } from '../../dropdown/dropdown-menu';
import { SAVE_MARKDOWN_CONTENT } from '../plugins/save';
import type { Frontmatter } from '../../../types';
import { Tooltip } from '../../tooltip';
import { cn } from '../../../utils/string-formatting';
import { LocalFilePath } from '../../../utils/path';

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
  const [editor] = useLexicalComposerContext();

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutationNew();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const openRenameFileDialog = useRenameFileDialog();

  const items = [
    // Pin/Unpin at the top
    {
      value: isPinned ? 'unpin-note' : 'pin-note',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <PinTack2 className="min-w-5" />{' '}
          {isPinned ? 'Unpin Note' : 'Pin Note'}
        </span>
      ),
    },
    // Reveal in Finder, Rename, then Move to Trash as the logical file actions
    {
      value: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-5" height={20} width={20} /> Reveal In Finder
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
          <Table className="min-w-5" />{' '}
          {frontmatter.showTableOfContents === 'true'
            ? 'Hide Table of Contents'
            : 'Show Table of Contents'}
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
    <DropdownMenu
      items={items}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      className="ml-auto flex flex-col"
      dropdownClassName="w-60 right-4 top-12"
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
          case 'rename-file': {
            const filePath = new LocalFilePath({
              folder,
              note: note.endsWith('.md') ? note : `${note}.md`,
            });
            openRenameFileDialog(filePath);
            break;
          }
          case 'reveal-in-finder': {
            revealInFinder({
              selectionRange: new Set([`note:${note}.md`]),
              folder,
            });
            break;
          }
          case 'move-to-trash': {
            moveToTrash({ path: `notes/${folder}/${note}.md` });
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
