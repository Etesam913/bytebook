import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { getDefaultButtonVariants } from '../../animations';
import { isNoteMaximizedAtom, projectSettingsAtom } from '../../atoms';
import { MotionIconButton } from '../buttons';
import { MaximizeNoteButton } from '../buttons/maximize-note';
import { DropdownMenu } from '../dropdown/dropdown-menu';
import { Tooltip } from '../tooltip';
import { Finder } from '../../icons/finder';
import { HorizontalDots } from '../../icons/horizontal-dots';
import { Magnifier } from '../../icons/magnifier';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import { Trash } from '../../icons/trash';
import { useRevealInFinderMutation } from '../../hooks/code';
import { useMoveToTrashMutation, usePinPathMutation } from '../../hooks/notes';
import type { FolderPath } from '../../utils/path';
import { routeUrls } from '../../utils/routes';
import { cn } from '../../utils/string-formatting';
import type { Folder } from '../virtualized/virtualized-file-tree/types';
import type { LegacyAnimationControls } from 'motion/react';

export function FolderRendererHeader({
  folderPath,
  folderTreeNode,
  animationControls,
}: {
  folderPath: FolderPath;
  folderTreeNode: Folder;
  animationControls: LegacyAnimationControls;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveToTrashMutation();
  const { mutate: pinPath } = usePinPathMutation();

  const isPinned = projectSettings.pinnedNotes.has(folderTreeNode.path);
  const items = [
    {
      value: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-5" height="1.125rem" width="1.125rem" />
          Reveal In Finder
        </span>
      ),
    },
    {
      value: isPinned ? 'unpin-folder' : 'pin-folder',
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
      value: 'move-to-trash',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Trash className="min-w-5" height="1.125rem" width="1.125rem" />
          Move to Trash
        </span>
      ),
    },
  ];

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
          <DropdownMenu
            items={items}
            isOpen={isSettingsOpen}
            setIsOpen={setIsSettingsOpen}
            className="ml-auto flex flex-col mr-2"
            dropdownClassName="right-4 top-10 w-52"
            onChange={(item) => {
              switch (item.value) {
                case 'reveal-in-finder': {
                  revealInFinder({
                    path: `notes/${folderTreeNode.path}`,
                    shouldPrefixWithProjectPath: true,
                  });
                  break;
                }
                case 'pin-folder':
                case 'unpin-folder': {
                  pinPath({
                    path: folderTreeNode.path,
                    shouldPin: item.value === 'pin-folder',
                  });
                  break;
                }
                case 'move-to-trash': {
                  moveToTrash({ paths: [folderTreeNode.path] });
                  break;
                }
              }
            }}
          >
            {({ buttonId, menuId, isOpen, handleKeyDown, handleClick }) => (
              <Tooltip
                content="Folder settings"
                placement="left"
                delay={{ open: 50 }}
              >
                <MotionIconButton
                  id={buttonId}
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  aria-haspopup="listbox"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? menuId : undefined}
                  aria-label="Folder settings menu"
                  className={cn(
                    'mt-1 shrink-0 rounded-tr-2xl',
                    isOpen && 'bg-zinc-100 dark:bg-zinc-700'
                  )}
                  {...getDefaultButtonVariants()}
                >
                  <HorizontalDots />
                </MotionIconButton>
              </Tooltip>
            )}
          </DropdownMenu>
        </div>
      </header>
      <hr className="mx-4 text-zinc-200 dark:text-zinc-700 col-span-full" />
    </div>
  );
}
