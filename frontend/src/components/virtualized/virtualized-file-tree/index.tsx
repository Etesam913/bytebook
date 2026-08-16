import { FileTree, useFileTree } from '@pierre/trees/react';
import {
  prepareFileTreeInput,
  type FileTreeDirectoryHandle,
  type FileTreeRenameEvent,
  type FileTreeDropResult,
} from '@pierre/trees';
import { type RefObject, useEffect, useRef } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { createFilePath, createFolderPath } from '../../../utils/path';
import {
  useAddFolderAttachmentsMutation,
  useMoveTreeItemsMutation,
  useRenameTreeItemMutation,
} from './hooks/tree-item-mutations';
import { useMoveToTrashMutation } from '../../../hooks/notes';
import { useAllPaths, useTopLevelPaths } from './hooks/use-all-paths';
import { usePierreRouteFocus } from './hooks/use-pierre-route-focus';
import { usePierreTreeEvents } from './hooks/use-pierre-tree-events';
import { getRenameInput } from './model-utils';
import { TreeHeader } from './tree-header';
import { TreeContextMenu } from './tree-context-menu';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../hooks/routes';

// The tree's own colors track the app theme automatically: the package uses
// `light-dark()` CSS and `useThemeSetting` sets `color-scheme` on the root
// element. The background must be opaque (not transparent) because the sticky
// folder overlay paints rows on top of the scrolling list with `--trees-bg` —
// match the app background from index.html (light rgb(252,252,252) /
// dark zinc-800).
const FILE_TREE_HOST_STYLE = {
  height: '100%',
  display: 'block',
  '--trees-bg-override': 'light-dark(rgb(252, 252, 252), rgb(39, 39, 42))',
  '--trees-accent-override': 'var(--accent-color)',
  '--trees-font-family-override': 'var(--app-font-family)',
} as React.CSSProperties;

// Separate sticky folder rows from the rows scrolling underneath them
// (zinc-200 / zinc-700).
const FILE_TREE_UNSAFE_CSS = `
  [data-file-tree-sticky-overlay-content="true"] {
    border-bottom: 1px solid light-dark(rgb(228, 228, 231), rgb(63, 63, 70));
  }
`;

/**
 * @pierre/trees marks directories with a trailing slash. Bytebook's routes and
 * backend APIs use slashless paths everywhere, so we strip the slash at the
 * boundary.
 */
function stripTrailingSlash(path: string): string {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

/**
 * The sidebar file tree, backed by @pierre/trees. Loads in two phases so the
 * first paint is instant: the model is created from the top-level entries
 * (a couple of items, resolved in ~1ms), then `resetPaths` silently swaps in
 * the full vault path list once `GetAllPaths` returns. After that, every
 * folder expand is instant and the Wails watcher events keep the model in
 * sync with disk.
 */
export function VirtualizedFileTree({
  ref,
}: {
  ref: RefObject<HTMLElement | null>;
}) {
  const topLevelQuery = useTopLevelPaths();

  if (!topLevelQuery.isSuccess) {
    return null;
  }

  return (
    <PierreFileTreeInner initialPaths={topLevelQuery.data} hostRef={ref} />
  );
}

function PierreFileTreeInner({
  initialPaths,
  hostRef,
}: {
  initialPaths: readonly string[];
  hostRef: RefObject<HTMLElement | null>;
}) {
  const routeFilePath = useFilePathFromRoute();
  const routeFolderPath = useFolderPathFromRoute();
  // pierre keys folders with a trailing slash, so the route→model bridge has
  // to match that convention before doing lookups.
  const routeTargetPath = routeFilePath
    ? routeFilePath.fullPath
    : routeFolderPath
      ? `${routeFolderPath.fullPath}/`
      : null;
  const lastNavigatedRef = useRef<string | null>(routeTargetPath);

  const { mutateAsync: renameTreeItem } = useRenameTreeItemMutation();
  const { mutateAsync: moveItems } = useMoveTreeItemsMutation();
  const { mutateAsync: moveToTrash } = useMoveToTrashMutation();
  const { mutate: addFolderAttachments } = useAddFolderAttachmentsMutation();

  // The model is created exactly once by useFileTree, so the callbacks below
  // capture the FIRST-render mutate functions. We funnel calls through refs
  // that get refreshed in effects so later renders' fresh mutate identities
  // are used instead of the stale closure.
  const renameRef = useRef(renameTreeItem);
  const moveItemsRef = useRef(moveItems);

  useEffect(() => {
    renameRef.current = renameTreeItem;
  }, [renameTreeItem]);

  useEffect(() => {
    moveItemsRef.current = moveItems;
  }, [moveItems]);

  // Every ancestor of the route target is a folder, so it must end in '/'.
  const initialExpandedPaths = (() => {
    if (!routeTargetPath) return [];
    const segments = stripTrailingSlash(routeTargetPath)
      .split('/')
      .filter(Boolean);
    return segments
      .slice(0, -1)
      .map((_, index) => `${segments.slice(0, index + 1).join('/')}/`);
  })();

  // Captured once — `useFileTree` only reads options on the first render, and
  // the very first `resetPaths` below should apply the expansion state the
  // model was mounted with, not whatever route is active later.
  const initialExpandedPathsRef = useRef(initialExpandedPaths);

  const { model } = useFileTree({
    paths: initialPaths,
    initialExpansion: 'closed',
    initialExpandedPaths,
    initialSelectedPaths: routeTargetPath ? [routeTargetPath] : [],
    stickyFolders: true,
    unsafeCSS: FILE_TREE_UNSAFE_CSS,
    onSelectionChange: (selectedPaths) => {
      if (selectedPaths.length !== 1) return;
      const path = selectedPaths[0];
      // pierre's startRenaming() re-selects the renamed row, which lands here.
      // Navigating then would mount the note editor, which steals focus from
      // the inline rename input and commits the rename immediately. The rename
      // editor renders on the next task, so defer the navigation one tick and
      // bail if a rename is in progress.
      setTimeout(() => {
        if (getRenameInput(model)) return;
        if (lastNavigatedRef.current === path) return;
        const isFolder = path.endsWith('/');
        const trimmed = stripTrailingSlash(path);
        if (isFolder) {
          const folderPath = createFolderPath(trimmed);
          if (folderPath) {
            lastNavigatedRef.current = path;
            navigate(folderPath.encodedFolderUrl);
          }
          return;
        }
        const filePath = createFilePath(trimmed);
        if (filePath) {
          lastNavigatedRef.current = path;
          navigate(filePath.encodedFileUrl);
        }
      }, 0);
    },
    dragAndDrop: {
      canDrop: ({ target }) => target.directoryPath !== null,
      onDropComplete: (result: FileTreeDropResult) => {
        const destination = result.target.directoryPath;
        if (destination === null) return;
        void moveItemsRef.current({
          itemPaths: result.draggedPaths.map(stripTrailingSlash),
          newFolder: stripTrailingSlash(destination),
        });
      },
    },
    renaming: {
      onRename: (event: FileTreeRenameEvent) => {
        const { sourcePath, destinationPath, isFolder } = event;
        if (sourcePath === destinationPath) return;
        const sourceNoSlash = stripTrailingSlash(sourcePath);
        const destNoSlash = stripTrailingSlash(destinationPath);
        const newName = destNoSlash.split('/').pop() ?? '';

        // pierre applies the rename to its model before this callback runs.
        // If the backend rename fails, put the path back so the tree matches
        // disk again (the watcher emits no event for a failed rename).
        const revert = (appliedPath: string) => {
          if (model.getItem(appliedPath) && !model.getItem(sourcePath)) {
            model.move(appliedPath, sourcePath);
          }
        };

        if (isFolder) {
          void renameRef
            .current({
              itemType: 'folder',
              folderPath: sourceNoSlash,
              newName,
            })
            .catch(() => revert(destinationPath));
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
        const actualDest = [...parentSegments, `${typedName}${suffix}`].join(
          '/'
        );
        let appliedPath = destinationPath;
        if (destNoSlash !== actualDest && model.getItem(destinationPath)) {
          model.move(destinationPath, actualDest, { collision: 'skip' });
          appliedPath = actualDest;
        }
        void renameRef
          .current({
            itemType: 'file',
            filePath,
            newName: typedName,
          })
          .catch(() => revert(appliedPath));
      },
    },
  });

  useEffect(() => {
    lastNavigatedRef.current = routeTargetPath;
  }, [routeTargetPath]);

  // Phase 2: swap in the full vault path list. The sidebar hides this tree
  // with <Activity> when switching to the search panel, which re-runs effects
  // on reveal — so this must NOT blindly reset (that would collapse whatever
  // the user had expanded). Reset only when the data actually changed, and
  // carry the current expansion/selection/focus across the reset.
  const allPathsQuery = useAllPaths();
  const allPaths = allPathsQuery.data;
  const lastResetPathsRef = useRef<readonly string[] | null>(null);
  useEffect(() => {
    if (!allPaths || lastResetPathsRef.current === allPaths) return;
    const isFirstReset = lastResetPathsRef.current === null;
    lastResetPathsRef.current = allPaths;

    const expandedDirectories = isFirstReset
      ? initialExpandedPathsRef.current
      : allPaths.filter((path) => {
          if (!path.endsWith('/')) return false;
          const item = model.getItem(path);
          if (item === null || !item.isDirectory()) return false;
          return (item as FileTreeDirectoryHandle).isExpanded();
        });
    const selectedPaths = model.getSelectedPaths();
    const focusedPath = model.getFocusedPath();

    model.resetPaths(allPaths, {
      preparedInput: prepareFileTreeInput(allPaths),
      initialExpandedPaths: expandedDirectories,
    });

    if (!isFirstReset) {
      for (const path of selectedPaths) {
        model.getItem(path)?.select();
      }
      if (focusedPath) {
        model.focusNearestPath(focusedPath);
      }
    }
  }, [model, allPaths]);

  usePierreTreeEvents(model);
  usePierreRouteFocus(model);

  function handleStartRename(path: string) {
    if (!model.startRenaming(path)) return;
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

  return (
    <div
      id="file-tree"
      ref={(node) => {
        hostRef.current = node;
      }}
      className="relative flex flex-1 flex-col min-h-0 overflow-hidden text-sm"
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
            onMoveToTrash={(paths) => {
              void moveToTrash({ paths });
            }}
            onAddFolderAttachments={addFolderAttachments}
            onStartRename={handleStartRename}
          />
        )}
        style={FILE_TREE_HOST_STYLE}
      />
    </div>
  );
}
