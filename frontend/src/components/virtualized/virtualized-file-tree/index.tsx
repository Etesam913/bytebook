import { prepareFileTreeInput, type FileTreeDropResult } from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { type RefObject, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { isDarkModeOnAtom } from '@/atoms';
import {
  remapPathThroughRename,
  splitPathSegments,
  stripTrailingSlash,
} from '@utils/path';
import {
  useAddFolderAttachmentsMutation,
  useMoveTreeItemsMutation,
  useRenameTreeItemMutation,
} from './hooks/tree-item-mutations';
import { useAllPaths } from '@hooks/all-paths';
import { useAddTreeItemMutation } from '@hooks/tree-items';
import { toast } from 'sonner';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';
import { cn } from '@utils/string-formatting';
import {
  applyTreeCreate,
  getPlaceholderPath,
  type TreeItemType,
} from './create';
import { restoreSelectionAfterDrag } from './drag';
import { FilteredFileTree } from './filtered-file-tree';
import { usePierreRouteFocus } from './hooks/use-pierre-route-focus';
import { usePierreTreeEvents } from './hooks/use-pierre-tree-events';
import { usePierreFileTreeDrop } from './hooks/use-pierre-file-tree-drop';
import { usePierreRouteTargetPath } from './hooks/use-route-target-path';
import { useSyncAllPaths } from './hooks/use-sync-all-paths';
import { useTreeFilter } from './hooks/use-tree-filter';
import { getRenameInput, getTreeHost, navigateToTreePath } from './model-utils';
import { applyTreeRename } from './rename';
import { FILE_TREE_HOST_STYLE, FILE_TREE_UNSAFE_CSS } from './styles';
import { TreeContextMenu } from './tree-context-menu';
import { TreeFilterSummary } from './tree-filter-summary';
import { TreeHeader } from './tree-header';
import { TreeSearchInput } from './tree-search-input';

// Later path updates sync directly into the model, so prepare only once.
function usePreparedTreeInput(paths: readonly string[]) {
  const preparedInputRef = useRef<ReturnType<
    typeof prepareFileTreeInput
  > | null>(null);
  preparedInputRef.current ??= prepareFileTreeInput(paths);
  return preparedInputRef.current;
}

// Expand the folder hierarchy above the initial route target.
function getInitialExpandedPaths(routeTargetPath: string | null) {
  if (!routeTargetPath) return [];
  const segments = splitPathSegments(routeTargetPath);
  return segments
    .slice(0, -1)
    .map((_, index) => `${segments.slice(0, index + 1).join('/')}/`);
}

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

  // Prevent route-selection sync from causing navigation loops.
  const lastNavigatedRef = useRef<string | null>(routeTargetPath);

  useEffect(() => {
    lastNavigatedRef.current = routeTargetPath;
  }, [routeTargetPath]);

  // Set by canDrag (the only pierre hook that runs before startDrag selects the
  // dragged row) and cleared on dragend. While set, selection emissions must
  // not route: the drag-start selection and the post-drop re-selection of a
  // moved item (not yet on disk) would both navigate otherwise.
  const draggedPathsRef = useRef<readonly string[] | null>(null);

  // ── Backend mutations ────────────────────────────────────────────────
  const { mutateAsync: renameTreeItem } = useRenameTreeItemMutation();
  const { mutateAsync: moveItems } = useMoveTreeItemsMutation();
  const { mutate: addFolderAttachments } = useAddFolderAttachmentsMutation();
  const { mutateAsync: addTreeItem } = useAddTreeItemMutation();

  // Distinguishes inline creation from a normal rename. `unsubscribe` releases
  // the placeholder-removal listener; every exit from the create flow must call
  // it, since only the cancel path removes the placeholder.
  const pendingCreateRef = useRef<{
    placeholderPath: string;
    parentFolderPath: string;
    unsubscribe: () => void;
  } | null>(null);

  // ── Tree model ───────────────────────────────────────────────────────
  const preparedInput = usePreparedTreeInput(initialPaths);

  const { model } = useFileTree({
    preparedInput,
    initialExpansion: 'closed',
    initialExpandedPaths: getInitialExpandedPaths(routeTargetPath),
    initialSelectedPaths: routeTargetPath ? [routeTargetPath] : [],
    // getVisibleRowIndex counts one row per path; pierre's default flattening
    // merges single-child directory chains into one row, which would make every
    // reveal/deep-link scroll land off by the number of merged chains.
    flattenEmptyDirectories: false,
    stickyFolders: true,
    icons: 'minimal',
    unsafeCSS: FILE_TREE_UNSAFE_CSS,
    composition: {
      contextMenu: {
        triggerMode: 'both',
      },
    },
    onSelectionChange: (selectedPaths) => {
      if (draggedPathsRef.current) return;
      if (selectedPaths.length !== 1) return;
      const path = selectedPaths[0];

      // startRenaming() bumps the selection version and emits, so beginning an
      // inline create reports the placeholder as selected. Never route to it —
      // the path does not exist on disk until the name is committed.
      if (path === pendingCreateRef.current?.placeholderPath) return;

      if (lastNavigatedRef.current === path) return;
      lastNavigatedRef.current = path;
      navigateToTreePath(path);
    },
    dragAndDrop: {
      canDrag: (paths) => {
        draggedPathsRef.current = paths;
        return true;
      },
      canDrop: ({ target }) => target.directoryPath !== null,
      onDropComplete: (result: FileTreeDropResult) => {
        const destination = result.target.directoryPath;
        if (destination === null) return;
        // The new path isn't on disk yet; useSyncRouteWithRenames moves the
        // route once the watcher reports the rename.
        void moveItems({
          itemPaths: result.draggedPaths,
          newFolder: destination,
        });
      },
    },
    renaming: {
      onRename: (event) => {
        const pending = pendingCreateRef.current;
        if (
          pending &&
          stripTrailingSlash(event.sourcePath) ===
            stripTrailingSlash(pending.placeholderPath)
        ) {
          // A committed placeholder is moved, not removed, so the removal
          // listener would never fire — release it here.
          pending.unsubscribe();
          pendingCreateRef.current = null;
          // Pierre moves the placeholder after this callback returns.
          queueMicrotask(() =>
            applyTreeCreate({
              model,
              event,
              parentFolderPath: pending.parentFolderPath,
              addTreeItem,
            })
          );
          return;
        }
        // Pierre applies the rename to its model right after this callback,
        // which remaps the selection and would fire onSelectionChange with the
        // new path — before the backend has renamed anything on disk. Navigation
        // on renames is owned by useSyncRouteWithRenames (driven by the watcher
        // event), so pre-remap lastNavigatedRef to swallow that early emission
        // when the current route is the renamed item or lives inside it.
        const remapped = remapPathThroughRename({
          path: lastNavigatedRef.current ?? '',
          oldPath: event.sourcePath,
          newPath: event.destinationPath,
          isFolder: event.isFolder,
        });
        if (remapped) lastNavigatedRef.current = remapped;
        applyTreeRename({ model, event, renameTreeItem });
      },
      onError: (error) => {
        // Remove failed create placeholders from the model.
        const pending = pendingCreateRef.current;
        if (pending) pending.unsubscribe();
        if (pending && model.getItem(pending.placeholderPath)) {
          model.remove(
            pending.placeholderPath,
            pending.placeholderPath.endsWith('/')
              ? { recursive: true }
              : undefined
          );
        }
        pendingCreateRef.current = null;
        toast.error(error, DEFAULT_SONNER_OPTIONS);
      },
    },
  });

  const {
    searchValue,
    onSearchChange,
    isFilterMode,
    filteredPaths,
    isFilterLoading,
  } = useTreeFilter();

  useSyncAllPaths({ model, initialPaths, preparedInput });
  usePierreTreeEvents(model);
  usePierreRouteFocus(model, isFilterMode);
  usePierreFileTreeDrop(model);

  function handleStartRename(path: string) {
    if (!model.startRenaming(path)) return;
    // Select the name while preserving the file extension.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const input = getRenameInput(model);
        if (!input) return;
        const dotIndex = input.value.lastIndexOf('.');
        if (dotIndex > 0) input.setSelectionRange(0, dotIndex);
      });
    });
  }

  function handleStartCreate({
    folderPath,
    itemType,
  }: {
    folderPath: string;
    itemType: TreeItemType;
  }) {
    const placeholderPath = getPlaceholderPath({
      parentPath: folderPath,
      itemType,
      hasItem: (path) => model.getItem(path) !== null,
    });
    // Clear pending state when creation is canceled.
    const unsubscribe = model.onMutation('remove', (event) => {
      if (event.path !== placeholderPath) return;
      if (pendingCreateRef.current?.placeholderPath === placeholderPath) {
        pendingCreateRef.current = null;
      }
      unsubscribe();
    });
    // Set before startRenaming: it re-selects the placeholder and emits, which
    // onSelectionChange must recognize as a create rather than a navigation.
    pendingCreateRef.current = {
      placeholderPath,
      parentFolderPath: folderPath,
      unsubscribe,
    };
    model.add(placeholderPath);
    if (!model.startRenaming(placeholderPath, { removeIfCanceled: true })) {
      unsubscribe();
      pendingCreateRef.current = null;
      model.remove(
        placeholderPath,
        placeholderPath.endsWith('/') ? { recursive: true } : undefined
      );
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const input = getRenameInput(model);
        if (!input) return;
        // Start empty because unchanged seed names do not trigger onRename.
        // Notify the controlled input after clearing the DOM value.
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.select();
      });
    });
  }

  function handleDragEnd() {
    if (!draggedPathsRef.current) return;
    draggedPathsRef.current = null;
    restoreSelectionAfterDrag(model, routeTargetPath);
  }

  // ── Keyboard handling ────────────────────────────────────────────────
  // Pierre handles F2 but not Enter for renaming focused rows.
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Enter') return;
    if (event.target !== getTreeHost(model)) return;
    if (getRenameInput(model)) return;
    const focusedPath = model.getFocusedPath();
    if (!focusedPath) return;
    event.preventDefault();
    handleStartRename(focusedPath);
  }

  // ── Render ───────────────────────────────────────────────────────────
  // Override the tree's OS-based color scheme with the app theme.
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);
  const hostStyle: React.CSSProperties = {
    ...FILE_TREE_HOST_STYLE,
    colorScheme: isDarkModeOn ? 'dark' : 'light',
  };

  return (
    <div
      id="file-tree"
      data-file-drop-target
      ref={(node) => {
        hostRef.current = node;
      }}
      className="relative flex flex-1 flex-col min-h-0 overflow-hidden text-sm"
      onKeyDown={handleKeyDown}
      // dragend is composed, so it bubbles out of pierre's shadow root to here.
      onDragEnd={handleDragEnd}
    >
      {/* Keep the header outside shadow DOM so its input retains key events. */}
      <TreeHeader />
      <TreeSearchInput value={searchValue} onChange={onSearchChange} />
      <TreeFilterSummary
        query={searchValue}
        resultCount={filteredPaths?.length ?? 0}
        isLoading={isFilterLoading}
      />
      {/* Keep tree state and sync active while filtered results are shown. */}
      <div className={cn('contents', isFilterMode && 'hidden')}>
        <FileTree
          model={model}
          renderContextMenu={(item, context) => (
            <TreeContextMenu
              item={item}
              context={context}
              selectedPaths={model.getSelectedPaths()}
              onAddFolderAttachments={addFolderAttachments}
              onStartRename={handleStartRename}
              onStartCreate={handleStartCreate}
            />
          )}
          style={hostStyle}
        />
      </div>
      {isFilterMode && (
        <FilteredFileTree
          paths={filteredPaths}
          isLoading={isFilterLoading}
          hostStyle={hostStyle}
          routeTargetPath={routeTargetPath}
        />
      )}
    </div>
  );
}
