import {
  FileTree as FileTreeModel,
  prepareFileTreeInput,
  type FileTreeDropResult,
  type FileTreeRenameEvent,
} from '@pierre/trees';
import { navigate } from 'wouter/use-browser-location';
import {
  createFilePath,
  createFolderPath,
  stripTrailingSlash,
} from '../../../utils/path';
import type {
  useMoveTreeItemsMutation,
  useRenameTreeItemMutation,
} from './hooks/tree-item-mutations';
import { setSortedTreePaths } from './model-utils';
import { FILE_TREE_UNSAFE_CSS } from './styles';

// The tree model is a MODULE-LEVEL singleton, created on first mount and never
// destroyed. The sidebar hides the files panel with <Activity> when switching
// to the search panel, and Activity runs effect cleanup on hide — so anything
// managed per-mount (like `useFileTree`, whose cleanup calls model.cleanUp())
// loses all expansion/selection state on every panel switch. Because the model
// outlives any mount, every callback baked into it at creation reads its
// collaborators through the module-level holders below instead of closing over
// per-mount values.
let sharedModel: FileTreeModel | null = null;

/** Last path this component navigated to (suppresses selection→route loops). */
export const lastNavigated: { current: string | null } = { current: null };

/** Latest mutation functions, refreshed by effects on every render. */
export const mutations: {
  renameTreeItem:
    | ReturnType<typeof useRenameTreeItemMutation>['mutateAsync']
    | null;
  moveItems: ReturnType<typeof useMoveTreeItemsMutation>['mutateAsync'] | null;
} = { renameTreeItem: null, moveItems: null };

/**
 * True while `startRenaming` is running. The controller re-selects the renamed
 * row and emits the selection change synchronously, so `onSelectionChange` can
 * consult this flag to tell a rename-initiated selection apart from a real one
 * (navigating would mount the note editor, which steals focus from the inline
 * rename input and commits the rename immediately).
 */
let isSelectionFromRenameStart = false;

/**
 * Starts the inline rename for `path` through the shared model, flagging the
 * re-selection it emits so `onSelectionChange` does not navigate.
 */
export function startTreeRename(path: string): boolean {
  if (!sharedModel) return false;
  isSelectionFromRenameStart = true;
  try {
    return sharedModel.startRenaming(path);
  } finally {
    isSelectionFromRenameStart = false;
  }
}

/**
 * Flags any selection change emitted synchronously during the current event
 * dispatch as rename-initiated. Used for F2, whose rename @pierre/trees
 * starts internally (so it never goes through `startTreeRename`).
 */
export function markRenameStartFromKeyboardEvent(): void {
  isSelectionFromRenameStart = true;
  queueMicrotask(() => {
    isSelectionFromRenameStart = false;
  });
}

export function hasSharedModel(): boolean {
  return sharedModel !== null;
}

/**
 * Returns the singleton model, creating it on the very first mount. Kept as a
 * module function (not inline in the component) so the module-level state
 * assignments happen outside the render body.
 */
export function ensureSharedModel(init: {
  paths: readonly string[];
  routeTargetPath: string | null;
  initialExpandedPaths: readonly string[];
}): FileTreeModel {
  if (sharedModel !== null) return sharedModel;
  lastNavigated.current = init.routeTargetPath;
  const preparedInput = prepareFileTreeInput(init.paths);
  setSortedTreePaths(preparedInput.paths);
  sharedModel = createSharedModel({
    paths: init.paths,
    initialExpandedPaths: init.initialExpandedPaths,
    initialSelectedPaths: init.routeTargetPath ? [init.routeTargetPath] : [],
  });
  return sharedModel;
}

function navigateToTreePath(path: string) {
  const trimmed = stripTrailingSlash(path);
  const targetPath = path.endsWith('/')
    ? createFolderPath(trimmed)
    : createFilePath(trimmed);
  if (!targetPath) return;
  lastNavigated.current = path;
  navigate(
    targetPath.type === 'folder'
      ? targetPath.encodedFolderUrl
      : targetPath.encodedFileUrl
  );
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
      // startRenaming() re-selects the renamed row before its inline input
      // has mounted, so the flag (set synchronously around the rename start)
      // is the only reliable way to skip that selection.
      if (isSelectionFromRenameStart) return;
      if (lastNavigated.current === path) return;
      navigateToTreePath(path);
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
