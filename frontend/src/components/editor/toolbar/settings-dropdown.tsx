import { useNoteActions } from '../hooks/note-actions';
import { useAtomValue } from 'jotai';
import { Button } from 'react-aria-components/Button';
import { isFullscreenAtom } from '@/atoms';
import { ShareRight } from '@/icons/share-right';
import { Finder } from '@/icons/finder';
import { HorizontalDots } from '@/icons/horizontal-dots';
import { PinTack2 } from '@/icons/pin-tack-2';
import { TagPlus } from '@/icons/tag-plus';
import { Table } from '@/icons/table';
import { Trash } from '@/icons/trash';
import {
  AppMenu,
  AppMenuItem,
  AppMenuPopover,
  AppMenuTrigger,
} from '@components/menu';
import type { Frontmatter } from '@/types';
import { Tooltip } from '@components/tooltip';
import { cn } from '@utils/string-formatting';

export function SettingsDropdown({
  folder,
  note,
  frontmatter,
}: {
  folder: string;
  note: string;
  frontmatter: Frontmatter;
}) {
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const { isPinned, isTocVisible, handleAction } = useNoteActions({
    folder,
    note,
    frontmatter,
  });
  const items = [
    {
      id: 'open-in-new-window',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <ShareRight height="1.125rem" width="1.125rem" />
          Open in New Window
        </span>
      ),
    },
    {
      id: 'reveal-in-finder',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Finder className="min-w-5" height="1.125rem" width="1.125rem" />{' '}
          Reveal In Finder
        </span>
      ),
    },
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
      id: isTocVisible ? 'hide-table-of-contents' : 'show-table-of-contents',
      label: (
        <span className="flex items-center gap-1.5 will-change-transform">
          <Table className="min-w-5" height="1.125rem" width="1.125rem" />{' '}
          {isTocVisible ? 'Hide Table of Contents' : 'Show Table of Contents'}
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

  return (
    <div className="ml-auto flex flex-col">
      <AppMenuTrigger>
        <Tooltip content="Note settings" placement="left" delay={{ open: 50 }}>
          <Button
            aria-label="Note settings menu"
            className={({ isHovered, isPressed }) =>
              cn(
                'bg-transparent border-0 focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 aria-expanded:bg-zinc-100 dark:aria-expanded:bg-zinc-700 rounded-md h-auto p-1.5 disabled:opacity-30 will-change-transform outline-hidden transition-transform',
                !isFullscreen && 'rounded-tr-2xl',
                isHovered && 'scale-105',
                isPressed && 'scale-[0.975]'
              )
            }
          >
            <HorizontalDots />
          </Button>
        </Tooltip>
        <AppMenuPopover className="w-60">
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
