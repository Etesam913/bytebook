import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useAtomValue, useSetAtom } from 'jotai';
import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components';
import { useRoute } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import {
  dialogDataAtom,
  isFullscreenAtom,
  projectSettingsAtom,
} from '../../../atoms';
import {
  useMoveToTrashMutation,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { createFilePath } from '../../../utils/path';
import { ROUTE_PATTERNS } from '../../../utils/routes';
import { useEditTagsFormMutation } from '../../../hooks/tags';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { EditTagDialogChildren } from '../../../routes/notes-sidebar/edit-tag-dialog-children';
import { Finder } from '../../../icons/finder';
import { FolderOpen } from '../../../icons/folder-open';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { TagPlus } from '../../../icons/tag-plus';
import { Table } from '../../../icons/table';
import { Trash } from '../../../icons/trash';
import type { ProjectSettings } from '../../../types';
import {
  AppMenu,
  AppMenuItem,
  AppMenuPopover,
  AppMenuTrigger,
} from '../../menu';
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
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isPinned = projectSettings.pinnedNotes.has(`${folder}/${note}.md`);
  const setDialogData = useSetAtom(dialogDataAtom);
  const [editor] = useLexicalComposerContext();

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();

  const [isSearchRoute] = useRoute(ROUTE_PATTERNS.SEARCH);
  const [isSavedSearchRoute] = useRoute(ROUTE_PATTERNS.SAVED_SEARCH);
  const isOnSearchRoute = isSearchRoute || isSavedSearchRoute;

  const items = [
    {
      id: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-5" height="1.125rem" width="1.125rem" />{' '}
          Reveal In Finder
        </span>
      ),
    },
    ...(isOnSearchRoute
      ? [
          {
            id: 'open-in-files',
            label: (
              <span className="flex items-center gap-1.5 will-change-transform">
                <FolderOpen
                  className="min-w-5"
                  height="1.125rem"
                  width="1.125rem"
                />{' '}
                Open in Files
              </span>
            ),
          },
        ]
      : []),
    {
      id: isPinned ? 'unpin-note' : 'pin-note',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <PinTack2 className="min-w-5" height="1.125rem" width="1.125rem" />{' '}
          {isPinned ? 'Unpin Note' : 'Pin Note'}
        </span>
      ),
    },
    {
      id: 'edit-tags',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <TagPlus className="min-w-5" height="1.125rem" width="1.125rem" />{' '}
          Edit Tags
        </span>
      ),
    },
    {
      id:
        frontmatter.showTableOfContents === 'true'
          ? 'hide-table-of-contents'
          : 'show-table-of-contents',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Table className="min-w-5" height="1.125rem" width="1.125rem" />{' '}
          {frontmatter.showTableOfContents === 'true'
            ? 'Hide Table of Contents'
            : 'Show Table of Contents'}
        </span>
      ),
    },
    {
      id: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-5" height="1.125rem" width="1.125rem" /> Move
          to Trash
        </span>
      ),
    },
  ];

  function handleAction(key: Key) {
    switch (key) {
      case 'pin-note':
      case 'unpin-note': {
        const newPinnedNotes = new Set(projectSettings.pinnedNotes);
        if (key === 'pin-note') {
          newPinnedNotes.add(`${folder}/${note}.md`);
        } else {
          newPinnedNotes.delete(`${folder}/${note}.md`);
        }
        const newProjectSettings: ProjectSettings = {
          ...projectSettings,
          pinnedNotes: newPinnedNotes,
        };
        updateProjectSettings({
          newProjectSettings,
        });
        break;
      }
      case 'show-table-of-contents':
      case 'hide-table-of-contents': {
        const copyOfFrontmatter = { ...frontmatter };
        copyOfFrontmatter.showTableOfContents =
          key === 'show-table-of-contents' ? 'true' : 'false';

        editor.update(() => {
          editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, {
            newFrontmatter: copyOfFrontmatter,
          });
        });
        break;
      }
      case 'reveal-in-finder': {
        const filePath = createFilePath(`${folder}/${note}.md`);
        if (filePath) {
          revealInFinder({ path: filePath });
        }
        break;
      }
      case 'open-in-files': {
        const filePath = createFilePath(`${folder}/${note}.md`);
        if (filePath) {
          navigate(filePath.encodedFileUrl);
        }
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
          onSubmit: async (formData, setErrorText) => {
            return await editTags({
              formData,
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
  }

  return (
    <div className="ml-auto flex flex-col">
      <AppMenuTrigger>
        <Tooltip content="Note settings" placement="left" delay={{ open: 50 }}>
          <Button
            aria-label="Note settings menu"
            isDisabled={isToolbarDisabled}
            className={({ isHovered, isPressed }) =>
              cn(
                'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform outline-hidden transition-transform',
                !isFullscreen && 'rounded-tr-2xl',
                isHovered && 'scale-105',
                isPressed && 'scale-[0.975]'
              )
            }
          >
            <HorizontalDots />
          </Button>
        </Tooltip>
        <AppMenuPopover className="w-52">
          <AppMenu onAction={handleAction}>
            {items.map((item) => (
              <AppMenuItem key={item.id} id={item.id}>
                {item.label}
              </AppMenuItem>
            ))}
          </AppMenu>
        </AppMenuPopover>
      </AppMenuTrigger>
    </div>
  );
}
