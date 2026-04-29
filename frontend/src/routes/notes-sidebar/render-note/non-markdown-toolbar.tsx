import { useAtomValue, useSetAtom } from 'jotai';
import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components';
import { useRoute } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import {
  dialogDataAtom,
  isFullscreenAtom,
  isNoteMaximizedAtom,
  projectSettingsAtom,
} from '../../../atoms';
import { MaximizeNoteButton } from '../../../components/buttons/maximize-note';
import {
  AppMenu,
  AppMenuItem,
  AppMenuPopover,
  AppMenuTrigger,
} from '../../../components/menu';
import { Tooltip } from '../../../components/tooltip';
import {
  useMoveToTrashMutation,
  useNoteRevealInFinderMutation,
} from '../../../hooks/notes';
import { useEditTagsFormMutation } from '../../../hooks/tags';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { EditTagDialogChildren } from '../edit-tag-dialog-children';
import { Finder } from '../../../icons/finder';
import { FolderOpen } from '../../../icons/folder-open';
import { HorizontalDots } from '../../../icons/horizontal-dots';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { TagPlus } from '../../../icons/tag-plus';
import { Trash } from '../../../icons/trash';
import { cn } from '../../../utils/string-formatting';
import { FilePath } from '../../../utils/path';
import { ROUTE_PATTERNS } from '../../../utils/routes';
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
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  const isPinned = projectSettings.pinnedNotes.has(filePath.fullPath);

  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();
  useToggleSidebarEvent(animationControls);

  const [isSearchRoute] = useRoute(ROUTE_PATTERNS.SEARCH);
  const [isSavedSearchRoute] = useRoute(ROUTE_PATTERNS.SAVED_SEARCH);
  const isOnSearchRoute = isSearchRoute || isSavedSearchRoute;

  const items = [
    {
      id: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-4.5" height="1.125rem" width="1.125rem" />{' '}
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
                  className="min-w-4.5"
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
          <PinTack2 className="min-w-4.5" height="1.125rem" width="1.125rem" />{' '}
          {isPinned ? 'Unpin Note' : 'Pin Note'}
        </span>
      ),
    },
    {
      id: 'edit-tags',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <TagPlus className="min-w-4.5" height="1.125rem" width="1.125rem" />{' '}
          Edit Tags
        </span>
      ),
    },
    {
      id: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-4.5" height="1.125rem" width="1.125rem" />{' '}
          Move to Trash
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
          newPinnedNotes.add(filePath.fullPath);
        } else {
          newPinnedNotes.delete(filePath.fullPath);
        }
        updateProjectSettings({
          newProjectSettings: {
            ...projectSettings,
            pinnedNotes: newPinnedNotes,
          },
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
      case 'open-in-files': {
        navigate(filePath.encodedFileUrl);
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
          onSubmit: async (formData, setErrorText) => {
            return await editTags({
              formData,
              setErrorText,
              selectionRange,
              folder: filePath.folder,
            });
          },
        });
        break;
      }
      case 'move-to-trash': {
        moveToTrash({ paths: [filePath.fullPath] });
        break;
      }
    }
  }

  return (
    <header
      className={cn(
        'flex w-full min-w-0 items-center gap-3 border-b pr-2 pb-2 pt-3.75 h-12 border-zinc-200 dark:border-b-zinc-700 whitespace-nowrap text-xs',
        isNoteMaximized && !isFullscreen && 'pl-23!'
      )}
    >
      <MaximizeNoteButton animationControls={animationControls} />
      <MediaMetadata filePath={filePath} path={filePath.encodedFileUrl} />
      <div className="flex flex-col ml-auto">
        <AppMenuTrigger>
          <Tooltip content="Note settings" placement="left">
            <Button
              aria-label="Note settings menu"
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
          <AppMenuPopover className="w-40">
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
    </header>
  );
}
