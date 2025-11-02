import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import { projectSettingsAtom } from '../../../atoms';
import {
  useMoveNoteToTrashMutation,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { Finder } from '../../../icons/finder';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { MarkdownIcon } from '../../../icons/markdown';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { Table } from '../../../icons/table';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';
import { MotionIconButton } from '../../buttons';
import { DropdownMenu } from '../../dropdown/dropdown-menu';
import { SAVE_MARKDOWN_CONTENT } from '../plugins/save';
import type { Frontmatter } from '../../../types';
import { Tooltip } from '../../tooltip';

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
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isPinned = projectSettings.pinnedNotes.has(`${folder}/${note}.md`);
  const [editor] = useLexicalComposerContext();

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveNoteToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();

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
      value:
        frontmatter.showMarkdown === 'true' ? 'hide-markdown' : 'show-markdown',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <MarkdownIcon className="min-w-5" />{' '}
          {frontmatter.showMarkdown === 'true'
            ? 'Hide Markdown'
            : 'Show Markdown'}
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
                shouldSkipNoteChangedEmit: false,
                newFrontmatter: copyOfFrontmatter,
              });
            });
            break;
          }
          case 'show-markdown':
          case 'hide-markdown': {
            const copyOfFrontmatter = { ...frontmatter };
            copyOfFrontmatter.showMarkdown =
              item.value === 'show-markdown' ? 'true' : 'false';
            editor.update(() => {
              editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, {
                shouldSkipNoteChangedEmit: false,
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
          case 'move-to-trash': {
            moveToTrash({
              selectionRange: new Set([`note:${note}.md`]),
              folder,
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
            className="rounded-tr-2xl"
            {...getDefaultButtonVariants({ disabled: isToolbarDisabled })}
          >
            <HorizontalDots />
          </MotionIconButton>
        </Tooltip>
      )}
    </DropdownMenu>
  );
}
