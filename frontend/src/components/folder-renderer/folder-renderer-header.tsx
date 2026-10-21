import { FOLDER_CONTENT_CLASS_NAME } from './styles';
import { useAtomValue, useSetAtom } from 'jotai';
import type { Key } from 'react-aria-components';
import { Button } from 'react-aria-components/Button';
import {
  focusTreeFilterInputAtom,
  isFileMaximizedAtom,
  projectSettingsAtom,
  treeFilterQueryAtom,
} from '@/atoms';
import { MaximizeNoteButton } from '@components/buttons/maximize-note';
import { useContextMenuItems } from '@components/context-menu/items';
import {
  AppMenu,
  AppMenuItem,
  AppMenuPopover,
  AppMenuTrigger,
} from '@components/menu';
import { Tooltip } from '@components/tooltip';
import { HorizontalDots } from '@/icons/horizontal-dots';
import { Magnifier } from '@/icons/magnifier';
import { stripTrailingSlash, type FolderPath } from '@utils/path';
import { cn } from '@utils/string-formatting';
import type { LegacyAnimationControls } from 'motion/react';
import { MotionIconButton } from '@components/buttons';
import { getDefaultButtonVariants } from '@/animations';

export function FolderRendererHeader({
  folderPath,
  animationControls,
}: {
  folderPath: FolderPath;
  animationControls: LegacyAnimationControls;
}) {
  const folderName = folderPath.folder;
  const isFileMaximized = useAtomValue(isFileMaximizedAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setTreeFilterQuery = useSetAtom(treeFilterQueryAtom);
  const focusTreeFilterInput = useSetAtom(focusTreeFilterInputAtom);
  const { openInNewWindow, revealInFinder, pin, moveToTrash } =
    useContextMenuItems();

  // pinnedNotes stores slashless paths (the settings.json format).
  const isPinned = projectSettings.pinnedNotes.has(
    stripTrailingSlash(folderPath.fullPath)
  );

  const items = [
    openInNewWindow({ path: folderPath }),
    revealInFinder({ path: folderPath }),
    pin({
      paths: [folderPath.fullPath],
      shouldPin: !isPinned,
      kind: 'folder',
    }),
    moveToTrash({ paths: [folderPath.fullPath] }),
  ];

  function handleAction(key: Key) {
    items.find((item) => item.value === key)?.onChange?.();
  }

  return (
    <header className="relative">
      <div
        className={cn(
          'absolute top-0 left-3 flex h-(--app-header-height) items-center',
          isFileMaximized && 'left-32'
        )}
      >
        <MaximizeNoteButton animationControls={animationControls} />
      </div>
      <div className="absolute top-0 right-3 flex h-(--app-header-height) items-center">
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
                  'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform outline-hidden transition-transform shrink-0 rounded-tr-xl',
                  isHovered && 'scale-105',
                  isPressed && 'scale-[0.975]'
                )
              }
            >
              <HorizontalDots />
            </Button>
          </Tooltip>
          <AppMenuPopover className="w-60" placement="bottom end">
            <AppMenu onAction={handleAction}>
              {items.map((item) => (
                <AppMenuItem key={item.value} id={item.value}>
                  {item.label}
                </AppMenuItem>
              ))}
            </AppMenu>
          </AppMenuPopover>
        </AppMenuTrigger>
      </div>
      <div className={cn(FOLDER_CONTENT_CLASS_NAME, 'pt-3 pb-5')}>
        <div
          className={cn(
            'mt-1.5 mr-9 @min-[1280px]:mr-0',
            isFileMaximized
              ? 'ml-40 @min-[1536px]:ml-0'
              : 'ml-10 @min-[1280px]:ml-0'
          )}
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Folder</p>
          <span className="mt-1 flex items-center gap-2.5">
            <h1
              title={folderName}
              className="min-w-0 truncate text-2xl font-semibold dark:text-zinc-50"
            >
              {folderName}
            </h1>
            <Tooltip content="Search this folder">
              <MotionIconButton
                {...getDefaultButtonVariants()}
                aria-label="Search this folder"
                className="shrink-0"
                onPress={() => {
                  setTreeFilterQuery(`f:"${folderPath.fullPath}"`);
                  focusTreeFilterInput();
                }}
              >
                <Magnifier width="0.875rem" height="0.875rem" />
              </MotionIconButton>
            </Tooltip>
          </span>
          <p
            title={folderPath.fullPath}
            className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400"
          >
            {folderPath.fullPath}
          </p>
        </div>
      </div>
      <div className={FOLDER_CONTENT_CLASS_NAME}>
        <hr className="border-zinc-200 dark:border-zinc-700" />
      </div>
    </header>
  );
}
