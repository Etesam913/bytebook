import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue } from 'jotai';
import { useRef, useState, useId } from 'react';
import { getDefaultButtonVariants } from '../../../animations';
import { projectSettingsAtom } from '../../../atoms';
import { useOnClickOutside } from '../../../hooks/general';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { MarkdownIcon } from '../../../icons/markdown';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { Table } from '../../../icons/table';
import type { ProjectSettings } from '../../../types';
import { MotionIconButton } from '../../buttons';
import { DropdownItems } from '../../dropdown/dropdown-items';
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
  const [focusIndex, setFocusIndex] = useState(0);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(dropdownContainerRef, () => setIsOpen(false));
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isPinned = projectSettings.pinnedNotes.has(`${folder}/${note}.md`);
  const [editor] = useLexicalComposerContext();

  const uniqueId = useId();
  const buttonId = `settings-dropdown-button-${uniqueId}`;
  const menuId = `settings-dropdown-menu-${uniqueId}`;

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();

  return (
    <div className="ml-auto flex flex-col" ref={dropdownContainerRef}>
      <Tooltip content="Note settings" placement="bottom">
        <MotionIconButton
          id={buttonId}
          onClick={() => setIsOpen((prev) => !prev)}
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
      <div className="relative flex flex-col items-end">
        <DropdownItems
          menuId={menuId}
          buttonId={buttonId}
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
            }
          }}
          className="w-60"
          items={[
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
                frontmatter.showMarkdown === 'true'
                  ? 'hide-markdown'
                  : 'show-markdown',
              label: (
                <span className="flex items-center gap-1.5 will-change-transform">
                  <MarkdownIcon className="min-w-5" />{' '}
                  {frontmatter.showMarkdown === 'true'
                    ? 'Hide Markdown'
                    : 'Show Markdown'}
                </span>
              ),
            },
          ]}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          setFocusIndex={setFocusIndex}
          focusIndex={focusIndex}
        />
      </div>
    </div>
  );
}
