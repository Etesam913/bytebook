import type {
  ContextMenuItem as FileTreeContextMenuItem,
  ContextMenuOpenContext as FileTreeContextMenuOpenContext,
} from '@pierre/trees';
import { useAtomValue } from 'jotai';
import { type ReactNode } from 'react';
import {
  usePinPathMutation,
  useRevealInFinderMutation,
} from '../../../hooks/notes';
import { projectSettingsAtom } from '../../../atoms';
import { createFilePath, createFolderPath } from '../../../utils/path';
import { MenuItemLabel } from '../../context-menu/items';
import { Trash } from '../../../icons/trash';
import { PaperclipPlus } from '../../../icons/paperclip-plus';
import { FilePen } from '../../../icons/file-pen';
import { Finder } from '../../../icons/finder';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { PinTackSlash } from '../../../icons/pin-tack-slash';

type MenuRow = {
  key: string;
  label: string;
  icon: ReactNode;
  /** When true, the rename row keeps focus so the inline editor receives it. */
  keepFocus?: boolean;
  onSelect: () => void;
};

/**
 * Bespoke context menu rendered for the @pierre/trees model. The pierre
 * library projects this React content into its shadow root via a slot, so
 * Tailwind classes still apply. Each row uses `context.close()` after
 * triggering its action.
 */
export function TreeContextMenu({
  item,
  context,
  onMoveToTrash,
  onAddFolderAttachments,
  onStartRename,
}: {
  item: FileTreeContextMenuItem;
  context: FileTreeContextMenuOpenContext;
  onMoveToTrash: (paths: string[]) => void;
  onAddFolderAttachments: (folderPath: string) => void;
  onStartRename: (path: string) => void;
}) {
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { mutate: pinPath } = usePinPathMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isFolder = item.kind === 'directory';
  // pierre marks directories with a trailing slash; Bytebook's path utilities
  // and backend APIs expect slashless paths, so strip it here.
  const slashlessPath = isFolder
    ? item.path.endsWith('/')
      ? item.path.slice(0, -1)
      : item.path
    : item.path;
  const filePath = isFolder ? null : createFilePath(slashlessPath);
  const folderPath = isFolder ? createFolderPath(slashlessPath) : null;
  const isPinned = projectSettings.pinnedNotes.has(slashlessPath);

  const rows: MenuRow[] = [];

  if (filePath || folderPath) {
    rows.push({
      key: 'reveal-in-finder',
      icon: <Finder height="1.0625rem" width="1.0625rem" />,
      label: 'Reveal in Finder',
      onSelect: () => {
        const path = filePath ?? folderPath;
        if (path) revealInFinder({ path });
      },
    });
  }

  if (isFolder) {
    rows.push({
      key: 'add-attachments',
      icon: <PaperclipPlus height="1.0625rem" width="1.0625rem" />,
      label: 'Add attachments',
      onSelect: () => onAddFolderAttachments(slashlessPath),
    });
  }

  rows.push({
    key: 'pin',
    icon: isPinned ? (
      <PinTackSlash height="1.0625rem" width="1.0625rem" />
    ) : (
      <PinTack2 height="1.0625rem" width="1.0625rem" />
    ),
    label: isPinned
      ? `Unpin ${isFolder ? 'Folder' : 'Note'}`
      : `Pin ${isFolder ? 'Folder' : 'Note'}`,
    onSelect: () => pinPath({ path: slashlessPath, shouldPin: !isPinned }),
  });

  rows.push({
    key: 'rename',
    icon: <FilePen height="1.0625rem" width="1.0625rem" />,
    label: 'Rename',
    keepFocus: true,
    onSelect: () => {
      // Close the menu *first* without restoring focus to the row — the inline
      // rename input will own focus once the model enters renaming mode. Pass
      // pierre's original (possibly slashed) path so startRenaming finds the
      // right node.
      context.close({ restoreFocus: false });
      onStartRename(item.path);
    },
  });

  rows.push({
    key: 'move-to-trash',
    icon: <Trash height="1.0625rem" width="1.0625rem" />,
    label: 'Move to Trash',
    onSelect: () => onMoveToTrash([slashlessPath]),
  });

  // Mirrors the native context menu's look (`components/context-menu` +
  // `components/menu`): translucent rounded-xl surface, rounded-lg rows, and
  // the accent highlight on hover/focus.
  return (
    <ul
      role="menu"
      data-file-tree-context-menu-root="true"
      className="w-fit flex flex-col overflow-hidden rounded-xl border-[0.078125rem] border-zinc-300 bg-zinc-50/92.5 shadow-xl dark:border-zinc-600 dark:bg-zinc-700/92.5 px-[0.28125rem] py-1.5 gap-0.5 text-sm outline-hidden"
    >
      {rows.map((row) => (
        <li key={row.key} role="presentation">
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-lg px-2 py-0.5 text-left whitespace-nowrap cursor-default outline-hidden hover:bg-(--accent-color) hover:text-white focus:bg-(--accent-color) focus:text-white"
            onClick={() => {
              row.onSelect();
              if (!row.keepFocus) {
                context.close({ restoreFocus: true });
              }
            }}
          >
            <MenuItemLabel icon={row.icon}>{row.label}</MenuItemLabel>
          </button>
        </li>
      ))}
    </ul>
  );
}
