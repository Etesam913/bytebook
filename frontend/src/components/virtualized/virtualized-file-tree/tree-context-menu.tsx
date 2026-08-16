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
  destructive?: boolean;
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
    destructive: true,
    onSelect: () => onMoveToTrash([slashlessPath]),
  });

  return (
    <ul
      role="menu"
      data-file-tree-context-menu-root="true"
      className="min-w-[12rem] py-1 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md text-sm"
    >
      {rows.map((row) => (
        <li key={row.key} role="presentation">
          {row.destructive && (
            <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
          )}
          <button
            type="button"
            role="menuitem"
            className={
              'w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:bg-zinc-100 dark:focus:bg-zinc-700 outline-none' +
              (row.destructive ? ' text-red-500' : '')
            }
            onClick={() => {
              row.onSelect();
              if (!row.keepFocus) {
                context.close({ restoreFocus: true });
              }
            }}
          >
            {row.icon}
            <span>{row.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
