import { useAtomValue } from 'jotai';
import { navigate } from 'wouter/use-browser-location';
import type { Key } from 'react-aria-components/Breadcrumbs';
import { Button } from 'react-aria-components/Button';
import { isFileMaximizedAtom, projectSettingsAtom } from '@/atoms';
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
import { routeUrls } from '@utils/routes';
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
  const { revealInFinder, pin, moveToTrash } = useContextMenuItems();

  // pinnedNotes stores slashless paths (the settings.json format).
  const isPinned = projectSettings.pinnedNotes.has(
    stripTrailingSlash(folderPath.fullPath)
  );

  const items = [
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
    <div className="space-y-3">
      <header
        className={cn(
          'flex w-full flex-col gap-1 pt-3',
          isFileMaximized && 'pl-32'
        )}
      >
        <div className="flex items-start gap-3">
          <MaximizeNoteButton animationControls={animationControls} />
          <div className="mt-1.5 min-w-0">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Folder</p>
            <span className="mt-1 flex items-center gap-2.5">
              <h1 className="truncate text-2xl font-semibold dark:text-zinc-50">
                {folderName}
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
              {folderPath.fullPath}
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
                      'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform outline-hidden transition-transform mt-1 shrink-0',
                      isHovered && 'scale-105',
                      isPressed && 'scale-[0.975]'
                    )
                  }
                >
                  <HorizontalDots />
                </Button>
              </Tooltip>
              <AppMenuPopover className="w-52" placement="bottom end">
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
        </div>
      </header>
      <hr className="mx-4 text-zinc-200 dark:text-zinc-700 col-span-full" />
    </div>
  );
}
