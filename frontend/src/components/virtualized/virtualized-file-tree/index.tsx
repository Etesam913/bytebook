import { FileTree, useFileTree } from '@pierre/trees/react';
import {
  prepareFileTreeInput,
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
import { TreeHeader } from './tree-header';
import { TreeContextMenu } from './tree-context-menu';
import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../hooks/routes';

// The tree's own colors track the app theme automatically: the package uses
// `light-dark()` CSS and `useThemeSetting` sets `color-scheme` on the root
// element. Blend its background into the sidebar and reuse the app accent.
const FILE_TREE_HOST_STYLE = {
  height: '100%',
  display: 'block',
  '--trees-bg-override': 'transparent',
  '--trees-accent-override': 'var(--accent-color)',
} as React.CSSProperties;

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
  // the phase-2 `resetPaths` below should re-apply the expansion state the
  // model was mounted with, not whatever route is active later.
  const initialExpandedPathsRef = useRef(initialExpandedPaths);

  const { model } = useFileTree({
    paths: initialPaths,
    initialExpansion: 'closed',
    initialExpandedPaths,
    initialSelectedPaths: routeTargetPath ? [routeTargetPath] : [],
    stickyFolders: true,
    onSelectionChange: (selectedPaths) => {
      if (selectedPaths.length !== 1) return;
      const path = selectedPaths[0];
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
        if (isFolder) {
          void renameRef.current({
            itemType: 'folder',
            folderPath: sourceNoSlash,
            newName,
          });
          return;
        }
        const filePath = createFilePath(sourceNoSlash);
        if (!filePath) return;
        const dotIndex = newName.lastIndexOf('.');
        const trimmed = dotIndex === -1 ? newName : newName.slice(0, dotIndex);
        void renameRef.current({
          itemType: 'file',
          filePath,
          newName: trimmed,
        });
      },
    },
  });

  useEffect(() => {
    lastNavigatedRef.current = routeTargetPath;
  }, [routeTargetPath]);

  // Phase 2: swap in the full vault path list. Visually a no-op — the same
  // top-level entries stay on screen; the model just now also knows what's
  // inside them, so every subsequent expand is instant with no network call.
  const allPathsQuery = useAllPaths();
  const allPaths = allPathsQuery.data;
  useEffect(() => {
    if (!allPaths) return;
    model.resetPaths(allPaths, {
      preparedInput: prepareFileTreeInput(allPaths),
      initialExpandedPaths: initialExpandedPathsRef.current,
    });
  }, [model, allPaths]);

  usePierreTreeEvents(model);
  usePierreRouteFocus(model);

  return (
    <div
      id="file-tree"
      ref={(node) => {
        hostRef.current = node;
      }}
      className="relative flex flex-1 flex-col min-h-0 overflow-hidden text-sm"
    >
      <FileTree
        model={model}
        header={<TreeHeader />}
        renderContextMenu={(item, context) => (
          <TreeContextMenu
            item={item}
            context={context}
            onMoveToTrash={(paths) => {
              void moveToTrash({ paths });
            }}
            onAddFolderAttachments={addFolderAttachments}
            onStartRename={(path) => model.startRenaming(path)}
          />
        )}
        style={FILE_TREE_HOST_STYLE}
      />
    </div>
  );
}
