import { useAtomValue } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components';
import { isNoteMaximizedAtom, projectSettingsAtom } from '../../atoms';
import { MaximizeNoteButton } from '../buttons/maximize-note';
import { AppMenu, AppMenuItem, AppMenuPopover, AppMenuTrigger } from '../menu';
import { Tooltip } from '../tooltip';
import { Finder } from '../../icons/finder';
import { HorizontalDots } from '../../icons/horizontal-dots';
import { Magnifier } from '../../icons/magnifier';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { Trash } from '../../icons/trash';
import {
  useMoveToTrashMutation,
  usePinPathMutation,
  useRevealInFinderMutation,
} from '../../hooks/notes';
import type { FolderPath } from '../../utils/path';
import { routeUrls } from '../../utils/routes';
import { cn } from '../../utils/string-formatting';
import type { Folder } from '../virtualized/virtualized-file-tree/types';
import type { LegacyAnimationControls } from 'motion/react';
import { MotionIconButton } from '../buttons';
import { getDefaultButtonVariants } from '../../animations';

export function FolderRendererHeader({
  folderPath,
  folderTreeNode,
  animationControls,
}: {
  folderPath: FolderPath;
  folderTreeNode: Folder;
  animationControls: LegacyAnimationControls;
}) {
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: pinPath } = usePinPathMutation();

  const isPinned = projectSettings.pinnedNotes.has(folderTreeNode.path);

  const items = [
    {
      id: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-5" height="1.125rem" width="1.125rem" />
          Reveal In Finder
        </span>
      ),
    },
    {
      id: isPinned ? 'unpin-folder' : 'pin-folder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          {isPinned ? (
            <PinTackSlash
              className="min-w-5"
              height="1.125rem"
              width="1.125rem"
            />
          ) : (
            <PinTack2 className="min-w-5" height="1.125rem" width="1.125rem" />
          )}
          {isPinned ? 'Unpin Folder' : 'Pin Folder'}
        </span>
      ),
    },
    {
      id: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-5" height="1.125rem" width="1.125rem" />
          Move to Trash
        </span>
      ),
    },
  ];

  function handleAction(key: Key) {
    switch (key) {
      case 'reveal-in-finder': {
        revealInFinder({ path: folderPath });
        break;
      }
      case 'pin-folder':
      case 'unpin-folder': {
        pinPath({
          path: folderTreeNode.path,
          shouldPin: key === 'pin-folder',
        });
        break;
      }
      case 'move-to-trash': {
        moveToTrash({ paths: [folderTreeNode.path] });
        break;
      }
    }
  }

  return (
    <div className="space-y-3">
      <header
        className={cn(
          'flex w-full flex-col gap-1 pt-3',
          isNoteMaximized && 'pl-32'
        )}
      >
        <div className="flex items-start gap-3">
          <MaximizeNoteButton animationControls={animationControls} />
          <div className="mt-1.5 min-w-0">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Folder</p>
            <span className="mt-1 flex items-center gap-2.5">
              <h1 className="truncate text-2xl font-semibold dark:text-zinc-50">
                {folderTreeNode.name}
              </h1>
              <Tooltip content="Search this folder">
                <MotionIconButton
                  {...getDefaultButtonVariants()}
                  aria-label="Search this folder"
                  className="shrink-0"
                  onClick={() => {
                    navigate(routeUrls.search(`f:"${folderPath.fullPath}"`));
                  }}
                >
                  <Magnifier width="0.875rem" height="0.875rem" />
                </MotionIconButton>
              </Tooltip>
            </span>
            <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {folderTreeNode.path + '/'}
            </p>
          </div>
          <div className="ml-auto flex flex-col mr-2">
            <AppMenuTrigger>
              <Tooltip
                content="Folder settings"
                placement="left"
                delay={{ open: 50 }}
              >
                <Button
                  aria-label="Folder settings menu"
                  className={({ isHovered, isPressed }) =>
                    cn(
                      'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform outline-hidden transition-transform mt-1 shrink-0 rounded-tr-2xl',
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
        </div>
      </header>
      <hr className="mx-4 text-zinc-200 dark:text-zinc-700 col-span-full" />
    </div>
  );
}
