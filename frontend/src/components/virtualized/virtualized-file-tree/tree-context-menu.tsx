import type {
  ContextMenuItem as FileTreeContextMenuItem,
  ContextMenuOpenContext as FileTreeContextMenuOpenContext,
} from '@pierre/trees';
import { useAtomValue } from 'jotai';
import { type ReactNode } from 'react';
import { useRevealInFinderMutation } from '../../../hooks/notes';
import { projectSettingsAtom } from '../../../atoms';
import {
  createFilePath,
  createFolderPath,
  stripTrailingSlash,
} from '../../../utils/path';
import { MenuItemLabel, useContextMenuItems } from '../../context-menu/items';
import type { DropdownItem } from '../../../types';
import { Trash } from '../../../icons/trash';
import { PaperclipPlus } from '../../../icons/paperclip-plus';
import { FilePen } from '../../../icons/file-pen';
import { Finder } from '../../../icons/finder';

type MenuRow = {
  key: string;
  content: ReactNode;
  /** When true, the rename row keeps focus so the inline editor receives it. */
  keepFocus?: boolean;
  onSelect: () => void;
};

function dropdownItemToMenuRow(item: DropdownItem): MenuRow {
  return {
    key: item.value,
    content: item.label,
    onSelect: () => item.onChange?.(),
  };
}

/**
 * Bespoke context menu rendered for the @pierre/trees model. The pierre
 * library projects this React content into its shadow root via a slot, so
 * Tailwind classes still apply. Each row uses `context.close()` after
 * triggering its action.
 */
export function TreeContextMenu({
  item,
  context,
  selectedPaths,
  onMoveToTrash,
  onAddFolderAttachments,
  onStartRename,
}: {
  item: FileTreeContextMenuItem;
  context: FileTreeContextMenuOpenContext;
  selectedPaths: readonly string[];
  onMoveToTrash: (paths: string[]) => void;
  onAddFolderAttachments: (folderPath: string) => void;
  onStartRename: (path: string) => void;
}) {
  const { mutate: revealInFinder } = useRevealInFinderMutation();
  const { editTags, pin } = useContextMenuItems();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const isFolder = item.kind === 'directory';
  const filePath = isFolder ? null : createFilePath(item.path);
  const folderPath = isFolder ? createFolderPath(item.path) : null;

  // Menu actions apply to the whole selection when the right-clicked item is
  // part of it, otherwise to just the right-clicked item.
  const isItemInSelection = selectedPaths.includes(item.path);
  const targetPaths = isItemInSelection ? selectedPaths : [item.path];
  const isMultiSelection = targetPaths.length > 1;
  const targetHasFolder = targetPaths.some((path) => path.endsWith('/'));
  const targetFilePaths = targetHasFolder
    ? []
    : targetPaths.flatMap((path) => {
        const target = createFilePath(path);
        return target ? [target] : [];
      });

  const rows: MenuRow[] = [];

  if (filePath || folderPath) {
    rows.push({
      key: 'reveal-in-finder',
      content: (
        <MenuItemLabel icon={<Finder height="1.0625rem" width="1.0625rem" />}>
          Reveal in Finder
        </MenuItemLabel>
      ),
      onSelect: () => {
        const path = filePath ?? folderPath;
        if (path) revealInFinder({ path });
      },
    });
  }

  if (isFolder) {
    rows.push({
      key: 'add-attachments',
      content: (
        <MenuItemLabel
          icon={<PaperclipPlus height="1.0625rem" width="1.0625rem" />}
        >
          Add attachments
        </MenuItemLabel>
      ),
      onSelect: () => onAddFolderAttachments(item.path),
    });
  }

  // pinnedNotes stores slashless paths (the settings.json format), so
  // membership checks strip pierre's folder marker.
  if (targetHasFolder) {
    // Folders (or mixed selections) pin only the right-clicked item.
    const isPinned = projectSettings.pinnedNotes.has(
      stripTrailingSlash(item.path)
    );
    rows.push(
      dropdownItemToMenuRow(
        pin({
          paths: [item.path],
          shouldPin: !isPinned,
          kind: isFolder ? 'folder' : 'note',
        })
      )
    );
  } else {
    rows.push(
      dropdownItemToMenuRow(
        pin({
          paths: [...targetPaths],
          shouldPin: targetPaths.some(
            (path) => !projectSettings.pinnedNotes.has(path)
          ),
          kind: 'note',
        })
      )
    );
  }

  const uniqueFolders = new Set(targetFilePaths.map((target) => target.folder));
  const isEditTagsEligible =
    !targetHasFolder &&
    targetFilePaths.length > 0 &&
    targetFilePaths.length === targetPaths.length &&
    uniqueFolders.size === 1;

  if (isEditTagsEligible) {
    rows.push(
      dropdownItemToMenuRow(
        editTags({
          folder: targetFilePaths[0].folder,
          selectionRange: new Set(
            targetFilePaths.map((target) => `note:${target.note}`)
          ),
        })
      )
    );
  }

  if (!isMultiSelection) {
    rows.push({
      key: 'rename',
      content: (
        <MenuItemLabel icon={<FilePen height="1.0625rem" width="1.0625rem" />}>
          Rename
        </MenuItemLabel>
      ),
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
  }

  rows.push({
    key: 'move-to-trash',
    content: (
      <MenuItemLabel icon={<Trash height="1.0625rem" width="1.0625rem" />}>
        Move to Trash
      </MenuItemLabel>
    ),
    onSelect: () => onMoveToTrash([...targetPaths]),
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
            {row.content}
          </button>
        </li>
      ))}
    </ul>
  );
}
