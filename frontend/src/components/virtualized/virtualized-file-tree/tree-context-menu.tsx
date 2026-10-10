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
import { useInteractOutside } from 'react-aria';
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

type StartCreateHandler = (args: {
  folderPath: string;
  itemType: TreeItemType;
}) => void;

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

function addFilesRow(onSelect: () => void): MenuRow {
  return {
    key: 'add-files',
    content: (
      <MenuItemLabel
        icon={<PaperclipPlus height="1.0625rem" width="1.0625rem" />}
      >
        Add files
      </MenuItemLabel>
    ),
    onSelect,
  };
}

// Create rows hand focus to pierre's inline input, so `close` must not
// restore focus to the tree.
function createRows({
  folderPath,
  close,
  onStartCreate,
}: {
  folderPath: string;
  close: () => void;
  onStartCreate: StartCreateHandler;
}): MenuRow[] {
  return [
    {
      key: 'create-folder',
      content: (
        <MenuItemLabel icon={<FolderPen {...ICON_PROPS} />}>
          Create Folder
        </MenuItemLabel>
      ),
      keepFocus: true,
      onSelect: () => {
        close();
        onStartCreate({ folderPath, itemType: FOLDER_TYPE });
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
        close();
        onStartCreate({ folderPath, itemType: FILE_TYPE });
      },
    },
  ];
}

// Bespoke context menu rendered for the @pierre/trees model. Pierre would
// project this content into its shadow root via a slot, but we portal it to
// document.body instead so no shadow container can clip or intercept it.
// Each row uses `context.close()` after triggering its action.
export function TreeContextMenu({
  item,
  context,
  selectedPaths,
  onAddFiles,
  onStartRename,
  onStartCreate,
}: {
  item: FileTreeContextMenuItem;
  context: FileTreeContextMenuOpenContext;
  selectedPaths: readonly string[];
  onAddFiles: (folderPath: string) => void;
  onStartRename: (path: string) => void;
  onStartCreate: StartCreateHandler;
}) {
  const {
    editTags,
    moveToTrash,
    pin,
    rename,
    revealInFinder,
    openInNewWindow,
  } = useContextMenuItems();
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
    rows.push(
      dropdownItemToMenuRow(openInNewWindow({ path: revealTarget })),
      dropdownItemToMenuRow(revealInFinder({ path: revealTarget }))
    );
  }

  if (isFolder && !isMultiSelection) {
    rows.push(
      ...createRows({
        folderPath: item.path,
        close: () => context.close({ restoreFocus: false }),
        onStartCreate,
      }),
      renameRow()
    );
  }

  if (isFolder) {
    rows.push(addFilesRow(() => onAddFiles(item.path)));
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

  const isEditTagsEligible =
    !targetHasFolder &&
    targetFilePaths.length > 0 &&
    targetFilePaths.length === targetPaths.length;

  if (isEditTagsEligible) {
    rows.push(
      dropdownItemToMenuRow(
        editTags({
          filePaths: targetFilePaths.map((target) => target.fullPath),
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
  // open from the click point.
  const isPointer =
    context.anchorElement?.style.position === 'fixed' ||
    context.anchorRect.width === 0;

  return (
    <TreeMenuPopover
      rows={rows}
      anchorRect={context.anchorRect}
      isPointer={isPointer}
      onClose={context.close}
    />
  );
}

// Opened by right-clicking empty space below the rows; creates at the root.
export function TreeBackgroundContextMenu({
  anchorRect,
  onClose,
  onStartCreate,
  onAddFiles,
}: {
  anchorRect: AnchorRect;
  onClose: () => void;
  onStartCreate: StartCreateHandler;
  onAddFiles: (folderPath: string) => void;
}) {
  return (
    <TreeMenuPopover
      rows={[
        ...createRows({ folderPath: '', close: onClose, onStartCreate }),
        addFilesRow(() => onAddFiles('')),
      ]}
      anchorRect={anchorRect}
      isPointer
      isSelfDismissing
      onClose={onClose}
    />
  );
}

type AnchorRect = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

function TreeMenuPopover({
  rows,
  anchorRect,
  isPointer,
  isSelfDismissing = false,
  onClose,
}: {
  rows: MenuRow[];
  anchorRect: AnchorRect;
  isPointer: boolean;
  /** Pierre dismisses its own menu; the background menu must dismiss itself. */
  isSelfDismissing?: boolean;
  onClose: (options: { restoreFocus: boolean }) => void;
}) {
  // useOverlayPosition measures the real menu and flips/constrains it against
  // the viewport, so no size estimates needed. The target is an invisible div in the portal replicating pierre's
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

  useInteractOutside({
    ref: menuRef,
    onInteractOutside: () => onClose({ restoreFocus: false }),
    isDisabled: isSelfDismissing,
  });

  // A standalone Tab press should close the menu. RAC normally leaves that to
  // its Popover, but pierre owns open/close of its menu and only closes on
  // outside mousedown and Escape (its document-level capture listener).
  function handleKeyDown(event: React.KeyboardEvent) {
    const shouldClose =
      event.key === 'Tab' || (isSelfDismissing && event.key === 'Escape');
    if (!shouldClose) return;
    event.preventDefault();
    onClose({ restoreFocus: true });
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
          top: `${anchorRect.top}px`,
          left: `${anchorRect.left}px`,
          width: `${anchorRect.width}px`,
          height: `${anchorRect.height}px`,
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
          onClose={() => onClose({ restoreFocus: true })}
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
