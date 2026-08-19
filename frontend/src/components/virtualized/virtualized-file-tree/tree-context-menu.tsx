import type {
  ContextMenuItem as FileTreeContextMenuItem,
  ContextMenuOpenContext as FileTreeContextMenuOpenContext,
} from '@pierre/trees';
import { useOverlayPosition } from '@react-aria/overlays';
import { useAtomValue } from 'jotai';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AppMenu, AppMenuItem } from '@components/menu';
import { projectSettingsAtom } from '@/atoms';
import {
  createFilePath,
  createFolderPath,
  stripTrailingSlash,
} from '@utils/path';
import {
  ICON_PROPS,
  MenuItemLabel,
  useContextMenuItems,
} from '@components/context-menu/items';
import type { DropdownItem } from '@/types';
import { Blog } from '@/icons/blog';
import { FolderPen } from '@/icons/folder-pen';
import { PaperclipPlus } from '@/icons/paperclip-plus';
import type { TreeItemType } from './create';
import { FILE_TYPE, FOLDER_TYPE } from '@utils/tree-item-types';

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

// Bespoke context menu rendered for the @pierre/trees model. Pierre would
// project this content into its shadow root via a slot, but we portal it to
// document.body instead so no shadow container can clip or intercept it.
// Each row uses `context.close()` after triggering its action.
export function TreeContextMenu({
  item,
  context,
  selectedPaths,
  onAddFolderAttachments,
  onStartRename,
  onStartCreate,
}: {
  item: FileTreeContextMenuItem;
  context: FileTreeContextMenuOpenContext;
  selectedPaths: readonly string[];
  onAddFolderAttachments: (folderPath: string) => void;
  onStartRename: (path: string) => void;
  onStartCreate: (args: { folderPath: string; itemType: TreeItemType }) => void;
}) {
  const { editTags, moveToTrash, pin, rename, revealInFinder } =
    useContextMenuItems();
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

  // The rename and create rows hand focus to pierre's inline input, so they
  // close the menu themselves with restoreFocus: false — restoring focus to
  // the tree row would yank it away from the input.
  const renameRow = (): MenuRow => ({
    ...dropdownItemToMenuRow(
      rename({
        onRename: () => {
          // Pass pierre's original (possibly slashed) path so startRenaming
          // finds the right node.
          context.close({ restoreFocus: false });
          onStartRename(item.path);
        },
      })
    ),
    keepFocus: true,
  });

  const revealTarget = filePath ?? folderPath;
  if (revealTarget) {
    rows.push(dropdownItemToMenuRow(revealInFinder({ path: revealTarget })));
  }

  if (isFolder && !isMultiSelection) {
    rows.push(
      {
        key: 'create-folder',
        content: (
          <MenuItemLabel icon={<FolderPen {...ICON_PROPS} />}>
            Create Folder
          </MenuItemLabel>
        ),
        keepFocus: true,
        onSelect: () => {
          context.close({ restoreFocus: false });
          onStartCreate({ folderPath: item.path, itemType: FOLDER_TYPE });
        },
      },
      {
        key: 'create-note',
        content: (
          <MenuItemLabel icon={<Blog {...ICON_PROPS} />}>
            Create Note
          </MenuItemLabel>
        ),
        keepFocus: true,
        onSelect: () => {
          context.close({ restoreFocus: false });
          onStartCreate({ folderPath: item.path, itemType: FILE_TYPE });
        },
      },
      renameRow()
    );
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

  // Folder menus already placed their rename row next to the create rows.
  if (!isMultiSelection && !isFolder) {
    rows.push(renameRow());
  }

  rows.push(dropdownItemToMenuRow(moveToTrash({ paths: [...targetPaths] })));

  // When opened via the row trigger button or keyboard, align to the button's
  // right edge and open downwards; when opened via pointer (right click),
  // open from the click point. useOverlayPosition measures the real menu and
  // flips/constrains it against the viewport, so no size estimates needed.
  const isPointer =
    context.anchorElement?.style.position === 'fixed' ||
    context.anchorRect.width === 0;

  // The target is an invisible div in the portal replicating pierre's
  // anchorRect: pierre's own anchor element can't be used because its trigger
  // button's rect differs from the click point on right-click opens.
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { overlayProps } = useOverlayPosition({
    targetRef: anchorRef,
    overlayRef: menuRef,
    placement: isPointer ? 'bottom start' : 'bottom end',
    offset: isPointer ? 0 : 4,
    isOpen: true,
  });

  // A standalone Tab press should close the menu. RAC normally leaves that to
  // its Popover, but pierre owns open/close here and only closes on outside
  // mousedown and Escape (its document-level capture listener — RAC never
  // needs to see Escape).
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    context.close({ restoreFocus: true });
  }

  // Portaled to document.body to avoid clipping from overflow containers and shadow DOM key capture.
  // data-file-tree-context-menu-root is required for pierre's outside-click detection.
  // overlayProps.style carries position/zIndex/maxHeight from useOverlayPosition;
  // flex lets AppMenu's overflow-y-auto scroll when maxHeight constrains it.
  return createPortal(
    <>
      <div
        ref={anchorRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: `${context.anchorRect.top}px`,
          left: `${context.anchorRect.left}px`,
          width: `${context.anchorRect.width}px`,
          height: `${context.anchorRect.height}px`,
          pointerEvents: 'none',
        }}
      />
      <div
        ref={menuRef}
        data-file-tree-context-menu-root="true"
        style={overlayProps.style}
        onKeyDown={handleKeyDown}
        className="w-fit flex flex-col rounded-xl border-[0.078125rem] border-zinc-300 bg-zinc-50/92.5 shadow-xl dark:border-zinc-600 dark:bg-zinc-700/92.5 overflow-hidden"
      >
        <AppMenu
          aria-label="File tree actions"
          autoFocus="first"
          shouldFocusWrap
          onClose={() => context.close({ restoreFocus: true })}
        >
          {rows.map((row) => (
            <AppMenuItem
              key={row.key}
              id={row.key}
              textValue={row.key.replaceAll('-', ' ')}
              onAction={row.onSelect}
              // The rename row closes the menu itself with restoreFocus: false
              // so the inline rename input can take focus; onClose must not
              // fire a second close that would yank focus back to the tree.
              shouldCloseOnSelect={!row.keepFocus}
            >
              {row.content}
            </AppMenuItem>
          ))}
        </AppMenu>
      </div>
    </>,
    document.body
  );
}
