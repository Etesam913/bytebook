import {
  prepareFileTreeInput,
  type FileTreeDropResult,
  type FileTreeRenameEvent,
} from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { type RefObject, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { isDarkModeOnAtom } from '../../../atoms';
import { useMoveToTrashMutation } from '../../../hooks/notes';
import {
  createFilePath,
  splitPathSegments,
  stripTrailingSlash,
} from '../../../utils/path';
import {
  useAddFolderAttachmentsMutation,
  useMoveTreeItemsMutation,
  useRenameTreeItemMutation,
} from './hooks/tree-item-mutations';
import { useAllPaths } from './hooks/use-all-paths';
import { usePierreRouteFocus } from './hooks/use-pierre-route-focus';
import { usePierreTreeEvents } from './hooks/use-pierre-tree-events';
import { usePierreRouteTargetPath } from './hooks/use-route-target-path';
import { useSyncAllPaths } from './hooks/use-sync-all-paths';
import {
  getRenameInput,
  navigateToTreePath,
  setSortedTreePaths,
} from './model-utils';
import { FILE_TREE_HOST_STYLE, FILE_TREE_UNSAFE_CSS } from './styles';
import { TreeContextMenu } from './tree-context-menu';
import { TreeHeader } from './tree-header';

// Every ancestor of the route target is a folder, so it must end in '/'.
// Expands the parent directory hierarchy leading to the initial route target.
function getInitialExpandedPaths(routeTargetPath: string | null) {
  if (!routeTargetPath) return [];
  const segments = splitPathSegments(stripTrailingSlash(routeTargetPath));
  return segments
    .slice(0, -1)
    .map((_, index) => `${segments.slice(0, index + 1).join('/')}/`);
}

// The sidebar file tree, backed by @pierre/trees using useFileTree.
export function VirtualizedFileTree({
  ref,
}: {
  ref: RefObject<HTMLElement | null>;
}) {
  const allPathsQuery = useAllPaths();

  if (!allPathsQuery.data) {
    return null;
  }

  return (
    <PierreFileTreeInner initialPaths={allPathsQuery.data} hostRef={ref} />
  );
}

function PierreFileTreeInner({
  initialPaths,
  hostRef,
}: {
  initialPaths: readonly string[];
  hostRef: RefObject<HTMLElement | null>;
}) {
  // ── Navigation state ─────────────────────────────────────────────────
  const routeTargetPath = usePierreRouteTargetPath();

  // Tracks the last navigated path to prevent redundant navigation loops when
  // route changes synchronize selection back to the tree.
  const lastNavigatedRef = useRef<string | null>(routeTargetPath);

  // Set to true while initiating a rename (via F2, Enter, or context menu) to
  // stop onSelectionChange from navigating and stealing focus from the rename input.
  const isSelectionFromRenameStartRef = useRef(false);

  useEffect(() => {
    lastNavigatedRef.current = routeTargetPath;
  }, [routeTargetPath]);

  // ── Backend mutations ────────────────────────────────────────────────
  const { mutateAsync: renameTreeItem } = useRenameTreeItemMutation();
  const { mutateAsync: moveItems } = useMoveTreeItemsMutation();
  const { mutateAsync: moveToTrash } = useMoveToTrashMutation();
  const { mutate: addFolderAttachments } = useAddFolderAttachmentsMutation();

  // ── Tree model ───────────────────────────────────────────────────────
  const preparedInput = prepareFileTreeInput(initialPaths);
  // Keep the sorted path order cached for the scroll-into-view helper.
  setSortedTreePaths(preparedInput.paths);

  const { model } = useFileTree({
    preparedInput,
    initialExpansion: 'closed',
    initialExpandedPaths: getInitialExpandedPaths(routeTargetPath),
    initialSelectedPaths: routeTargetPath ? [routeTargetPath] : [],
    stickyFolders: true,
    unsafeCSS: FILE_TREE_UNSAFE_CSS,
    onSelectionChange: (selectedPaths) => {
      if (selectedPaths.length !== 1) return;
      const path = selectedPaths[0];

      if (lastNavigatedRef.current === path) return;
      lastNavigatedRef.current = path;
      navigateToTreePath(path);
    },
    dragAndDrop: {
      canDrop: ({ target }) => target.directoryPath !== null,
      onDropComplete: (result: FileTreeDropResult) => {
        const destination = result.target.directoryPath;
        if (destination === null) return;
        void moveItems({
          itemPaths: result.draggedPaths.map(stripTrailingSlash),
          newFolder: stripTrailingSlash(destination),
        });
      },
    },
    renaming: { onRename: (event) => handleRename(event) },
  });

  const allPaths = useSyncAllPaths(model);
  usePierreTreeEvents(model);
  usePierreRouteFocus(model, allPaths);

  // ── Rename handling ──────────────────────────────────────────────────
  function handleRename(event: FileTreeRenameEvent) {
    const { sourcePath, destinationPath, isFolder } = event;
    if (sourcePath === destinationPath) return;
    const sourceNoSlash = stripTrailingSlash(sourcePath);
    const destNoSlash = stripTrailingSlash(destinationPath);
    const newName = destNoSlash.split('/').pop() ?? '';

    // pierre applies the rename to its model before this callback runs.
    // If the backend rename fails, put the path back so the tree matches
    // disk again.
    const revert = (appliedPath: string) => {
      if (model.getItem(appliedPath) && !model.getItem(sourcePath)) {
        model.move(appliedPath, sourcePath);
      }
    };

    if (isFolder) {
      void renameTreeItem({
        itemType: 'folder',
        folderPath: sourceNoSlash,
        newName,
      }).catch(() => revert(destinationPath));
      return;
    }

    const filePath = createFilePath(sourceNoSlash);
    if (!filePath) return;
    // The file keeps its original extension no matter what was typed:
    // strip it if present, otherwise treat the whole input as the name.
    const suffix = `.${filePath.extension}`;
    const typedName = newName.endsWith(suffix)
      ? newName.slice(0, -suffix.length)
      : newName;
    // The backend will produce `<parent>/<typedName><suffix>`. If that
    // differs from what pierre applied (extension edited or removed),
    // correct the model now so the follow-up watcher event is a no-op.
    const parentSegments = destNoSlash.split('/').slice(0, -1);
    const actualDest = [...parentSegments, `${typedName}${suffix}`].join('/');
    let appliedPath = destinationPath;
    if (destNoSlash !== actualDest && model.getItem(destinationPath)) {
      model.move(destinationPath, actualDest, { collision: 'skip' });
      appliedPath = actualDest;
    }
    void renameTreeItem({
      itemType: 'file',
      filePath,
      newName: typedName,
    }).catch(() => revert(appliedPath));
  }

  function handleStartRename(path: string) {
    isSelectionFromRenameStartRef.current = true;
    try {
      if (!model.startRenaming(path)) return;
    } finally {
      isSelectionFromRenameStartRef.current = false;
    }
    // Match editor conventions: pre-select only the name part so typing
    // replaces the name and leaves the extension alone. The rename input
    // mounts and focuses on the next frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const input = getRenameInput(model);
        if (!input) return;
        const dotIndex = input.value.lastIndexOf('.');
        if (dotIndex > 0) input.setSelectionRange(0, dotIndex);
      });
    });
  }

  // ── Keyboard handling ────────────────────────────────────────────────
  // @pierre/trees only binds renaming to F2. Enter on a focused row is
  // unhandled there, so it bubbles out of the shadow root (retargeted to the
  // tree's host element) and we can start the rename here. The host-element
  // check keeps light-DOM children like the create-folder input unaffected,
  // and a commit-Enter never reaches this handler (the tree stops it).
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter') return;
    const container = model.getFileTreeContainer();
    const host =
      container?.getRootNode() instanceof ShadowRoot
        ? (container.getRootNode() as ShadowRoot).host
        : container;
    if (event.target !== host) return;
    if (getRenameInput(model)) return;
    const focusedPath = model.getFocusedPath();
    if (!focusedPath) return;
    event.preventDefault();
    handleStartRename(focusedPath);
  }

  // F2 renames start inside @pierre/trees, so flag them during the capture
  // phase (which runs before the tree's own shadow-DOM handler) to keep the
  // rename's re-selection from navigating.
  function handleKeyDownCapture(event: React.KeyboardEvent) {
    if (event.key === 'F2') {
      isSelectionFromRenameStartRef.current = true;
      queueMicrotask(() => {
        isSelectionFromRenameStartRef.current = false;
      });
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  // The tree's shadow stylesheet sets `color-scheme: light dark` on :host,
  // which makes its light-dark() colors follow the OS preference — not the
  // app's chosen theme. An inline style on the host element wins over the
  // shadow :host rule, so pin the scheme to the app's resolved mode.
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const hostStyle: React.CSSProperties = {
    ...FILE_TREE_HOST_STYLE,
    colorScheme: isDarkModeOn ? 'dark' : 'light',
  };

  return (
    <div
      id="file-tree"
      ref={(node) => {
        hostRef.current = node;
      }}
      className="relative flex flex-1 flex-col min-h-0 overflow-hidden text-sm"
      onKeyDown={handleKeyDown}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {/* Rendered outside the tree's shadow-DOM header slot on purpose: the
          tree's internal key/focus handlers sit between slotted content and
          the page, which breaks the inline create-folder input. */}
      <TreeHeader />
      <FileTree
        model={model}
        renderContextMenu={(item, context) => (
          <TreeContextMenu
            item={item}
            context={context}
            selectedPaths={model.getSelectedPaths()}
            onMoveToTrash={(paths) => {
              void moveToTrash({ paths });
            }}
            onAddFolderAttachments={addFolderAttachments}
            onStartRename={handleStartRename}
          />
        )}
        style={hostStyle}
      />
    </div>
  );
}
