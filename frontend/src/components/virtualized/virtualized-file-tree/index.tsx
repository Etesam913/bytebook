import { FileTree } from '@pierre/trees/react';
import {
  FileTree as FileTreeModel,
  prepareFileTreeInput,
  type FileTreeDirectoryHandle,
  type FileTreeRenameEvent,
  type FileTreeDropResult,
} from '@pierre/trees';
import { type RefObject, useEffect } from 'react';
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
import { getRenameInput, setSortedTreePaths } from './model-utils';
import { useAtomValue } from 'jotai';
import { isDarkModeOnAtom } from '../../../atoms';
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
  // Match the app's default text color (near-black / zinc-100) instead of the
  // package's muted gray default.
  '--trees-fg-override': 'light-dark(rgb(9, 9, 11), rgb(244, 244, 245))',
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

// The tree model is a MODULE-LEVEL singleton, created on first mount and never
// destroyed. The sidebar hides the files panel with <Activity> when switching
// to the search panel, and Activity runs effect cleanup on hide — so anything
// managed per-mount (like `useFileTree`, whose cleanup calls model.cleanUp())
// loses all expansion/selection state on every panel switch. Because the model
// outlives any mount, every callback baked into it at creation reads its
// collaborators through the module-level holders below instead of closing over
// per-mount values.
let sharedModel: FileTreeModel | null = null;
/** Expansion the very first `resetPaths` should apply (route ancestors). */
let firstResetExpandedPaths: readonly string[] = [];
/** Identity of the path list the model was last reset with. */
let lastResetPaths: readonly string[] | null = null;
/** Last path this component navigated to (suppresses selection→route loops). */
const lastNavigated: { current: string | null } = { current: null };
/** Latest mutation functions, refreshed by effects on every render. */
const mutations: {
  renameTreeItem:
    | ReturnType<typeof useRenameTreeItemMutation>['mutateAsync']
    | null;
  moveItems: ReturnType<typeof useMoveTreeItemsMutation>['mutateAsync'] | null;
} = { renameTreeItem: null, moveItems: null };

/**
 * Returns the singleton model, creating it on the very first mount. Kept as a
 * module function (not inline in the component) so the module-level state
 * assignments happen outside the render body.
 */
function ensureSharedModel(init: {
  paths: readonly string[];
  routeTargetPath: string | null;
  initialExpandedPaths: readonly string[];
}): FileTreeModel {
  if (sharedModel !== null) return sharedModel;
  lastNavigated.current = init.routeTargetPath;
  firstResetExpandedPaths = init.initialExpandedPaths;
  sharedModel = createSharedModel({
    paths: init.paths,
    initialExpandedPaths: init.initialExpandedPaths,
    initialSelectedPaths: init.routeTargetPath ? [init.routeTargetPath] : [],
  });
  return sharedModel;
}

function createSharedModel(init: {
  paths: readonly string[];
  initialExpandedPaths: readonly string[];
  initialSelectedPaths: readonly string[];
}): FileTreeModel {
  return new FileTreeModel({
    paths: init.paths,
    initialExpansion: 'closed',
    initialExpandedPaths: init.initialExpandedPaths,
    initialSelectedPaths: init.initialSelectedPaths,
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
        if (getRenameInput(sharedModel)) return;
        if (lastNavigated.current === path) return;
        const isFolder = path.endsWith('/');
        const trimmed = stripTrailingSlash(path);
        if (isFolder) {
          const folderPath = createFolderPath(trimmed);
          if (folderPath) {
            lastNavigated.current = path;
            navigate(folderPath.encodedFolderUrl);
          }
          return;
        }
        const filePath = createFilePath(trimmed);
        if (filePath) {
          lastNavigated.current = path;
          navigate(filePath.encodedFileUrl);
        }
      }, 0);
    },
    dragAndDrop: {
      canDrop: ({ target }) => target.directoryPath !== null,
      onDropComplete: (result: FileTreeDropResult) => {
        const destination = result.target.directoryPath;
        if (destination === null) return;
        void mutations.moveItems?.({
          itemPaths: result.draggedPaths.map(stripTrailingSlash),
          newFolder: stripTrailingSlash(destination),
        });
      },
    },
    renaming: {
      onRename: (event: FileTreeRenameEvent) => {
        const model = sharedModel;
        if (!model) return;
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
          void mutations
            .renameTreeItem?.({
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
        void mutations
          .renameTreeItem?.({
            itemType: 'file',
            filePath,
            newName: typedName,
          })
          .catch(() => revert(appliedPath));
      },
    },
  });
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

  // Once the shared model exists it carries all the state the tree needs, so
  // never gate on the query again (a cache miss here would unmount the tree).
  if (sharedModel === null && !topLevelQuery.isSuccess) {
    return null;
  }

  return (
    <PierreFileTreeInner
      initialPaths={topLevelQuery.data ?? []}
      hostRef={ref}
    />
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

  const { mutateAsync: renameTreeItem } = useRenameTreeItemMutation();
  const { mutateAsync: moveItems } = useMoveTreeItemsMutation();
  const { mutateAsync: moveToTrash } = useMoveToTrashMutation();
  const { mutate: addFolderAttachments } = useAddFolderAttachmentsMutation();

  useEffect(() => {
    mutations.renameTreeItem = renameTreeItem;
  }, [renameTreeItem]);

  useEffect(() => {
    mutations.moveItems = moveItems;
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

  const model = ensureSharedModel({
    paths: initialPaths,
    routeTargetPath,
    initialExpandedPaths,
  });

  useEffect(() => {
    lastNavigated.current = routeTargetPath;
  }, [routeTargetPath]);

  // Phase 2: swap in the full vault path list. This effect re-runs whenever
  // the panel is revealed again (<Activity>) or the query refetches, so it
  // must NOT blindly reset — reset only when the data actually changed, and
  // carry the current expansion/selection/focus across the reset.
  const allPathsQuery = useAllPaths();
  const allPaths = allPathsQuery.data;
  useEffect(() => {
    if (!allPaths || lastResetPaths === allPaths) return;
    const isFirstReset = lastResetPaths === null;
    lastResetPaths = allPaths;

    const expandedDirectories = isFirstReset
      ? firstResetExpandedPaths
      : allPaths.filter((path) => {
          if (!path.endsWith('/')) return false;
          const item = model.getItem(path);
          if (item === null || !item.isDirectory()) return false;
          return (item as FileTreeDirectoryHandle).isExpanded();
        });
    const selectedPaths = model.getSelectedPaths();
    const focusedPath = model.getFocusedPath();

    const preparedInput = prepareFileTreeInput(allPaths);
    // The prepared input's paths are in the tree's final row order — the
    // scroll-into-view helper needs it to map a path to a row index.
    setSortedTreePaths(preparedInput.paths);
    model.resetPaths(allPaths, {
      preparedInput,
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
  usePierreRouteFocus(model, allPaths);

  // The tree's shadow stylesheet sets `color-scheme: light dark` on :host,
  // which makes its light-dark() colors follow the OS preference — not the
  // app's chosen theme. An inline style on the host element wins over the
  // shadow :host rule, so pin the scheme to the app's resolved mode.
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const hostStyle: React.CSSProperties = {
    ...FILE_TREE_HOST_STYLE,
    colorScheme: isDarkModeOn ? 'dark' : 'light',
  };

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
      onKeyDown={handleKeyDown}
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
        style={hostStyle}
      />
    </div>
  );
}
