import { prepareFileTreeInput, type FileTreeDropResult } from '@pierre/trees';
import { FileTree } from '@pierre/trees/react';
import { type RefObject, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { isDarkModeOnAtom } from '@/atoms';
import { splitPathSegments } from '@utils/path';
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
import { FilteredFileTree } from './filtered-file-tree';
import { usePersistentFileTree } from './hooks/use-persistent-file-tree';
import { usePierreRouteFocus } from './hooks/use-pierre-route-focus';
import { usePierreTreeEvents } from './hooks/use-pierre-tree-events';
import { usePierreRouteTargetPath } from './hooks/use-route-target-path';
import { useSyncAllPaths } from './hooks/use-sync-all-paths';
import { useTreeFilter } from './hooks/use-tree-filter';
import { getRenameInput, getTreeHost, navigateToTreePath } from './model-utils';
import { applyTreeRename } from './rename';
import { FILE_TREE_HOST_STYLE, FILE_TREE_UNSAFE_CSS } from './styles';
import { TreeContextMenu } from './tree-context-menu';
import { TreeHeader } from './tree-header';
import { TreeSearchInput } from './tree-search-input';

/**
 * `prepareFileTreeInput` sorts the whole path list, and only the first result
 * ever reaches the model — every later list arrives through `useSyncAllPaths`
 * — so compute it once per component instance rather than on every render.
 */
function usePreparedTreeInput(paths: readonly string[]) {
  const preparedInputRef = useRef<ReturnType<
    typeof prepareFileTreeInput
  > | null>(null);
  preparedInputRef.current ??= prepareFileTreeInput(paths);
  return preparedInputRef.current;
}

// Every ancestor of the route target is a folder, so it must end in '/'.
// Expands the parent directory hierarchy leading to the initial route target.
function getInitialExpandedPaths(routeTargetPath: string | null) {
  if (!routeTargetPath) return [];
  const segments = splitPathSegments(routeTargetPath);
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

  useEffect(() => {
    lastNavigatedRef.current = routeTargetPath;
  }, [routeTargetPath]);

  // ── Backend mutations ────────────────────────────────────────────────
  const { mutateAsync: renameTreeItem } = useRenameTreeItemMutation();
  const { mutateAsync: moveItems } = useMoveTreeItemsMutation();
  const { mutate: addFolderAttachments } = useAddFolderAttachmentsMutation();
  const { mutateAsync: addTreeItem } = useAddTreeItemMutation();

  // A live inline-create placeholder, so the shared rename handlers can tell
  // a committed placeholder apart from a genuine rename.
  const pendingCreateRef = useRef<{
    placeholderPath: string;
    parentFolderPath: string;
  } | null>(null);

  // ── Tree model ───────────────────────────────────────────────────────
  const preparedInput = usePreparedTreeInput(initialPaths);

  const model = usePersistentFileTree({
    preparedInput,
    initialExpansion: 'closed',
    initialExpandedPaths: getInitialExpandedPaths(routeTargetPath),
    initialSelectedPaths: routeTargetPath ? [routeTargetPath] : [],
    stickyFolders: true,
    icons: 'minimal',
    searchBlurBehavior: 'retain',
    unsafeCSS: FILE_TREE_UNSAFE_CSS,
    composition: {
      contextMenu: {
        triggerMode: 'both',
      },
    },
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
          itemPaths: result.draggedPaths,
          newFolder: destination,
        });
      },
    },
    renaming: {
      onRename: (event) => {
        const pending = pendingCreateRef.current;
        if (pending && event.sourcePath === pending.placeholderPath) {
          pendingCreateRef.current = null;
          // Defer: pierre moves the placeholder to destinationPath *after*
          // this callback returns; applyTreeCreate reconciles against that
          // post-move state.
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
        // Pierre's optimistic move re-points selection at the typed path
        // while the backend rename is still in flight; suppress that
        // navigation and only navigate once disk agrees, so the note view
        // never chases a path that does not exist yet.
        const wasCurrent = lastNavigatedRef.current === event.sourcePath;
        if (wasCurrent) lastNavigatedRef.current = event.destinationPath;
        applyTreeRename({
          model,
          event,
          renameTreeItem,
          onSuccess: wasCurrent
            ? () => navigateToTreePath(event.destinationPath)
            : undefined,
        });
      },
      onError: (error) => {
        // A colliding/invalid committed name exits rename mode but keeps the
        // placeholder in the model — drop it so no phantom row survives.
        const pending = pendingCreateRef.current;
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

  useSyncAllPaths({ model, initialPaths, preparedInput });
  usePierreTreeEvents(model);
  usePierreRouteFocus(model);

  const filter = useTreeFilter(model);

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
    model.add(placeholderPath);
    pendingCreateRef.current = {
      placeholderPath,
      parentFolderPath: folderPath,
    };
    // Escape / empty commit removes the placeholder; clear the pending marker
    // when that removal lands so a later genuine rename can't be misread.
    const unsubscribe = model.onMutation('remove', (event) => {
      if (event.path !== placeholderPath) return;
      if (pendingCreateRef.current?.placeholderPath === placeholderPath) {
        pendingCreateRef.current = null;
      }
      unsubscribe();
    });
    if (!model.startRenaming(placeholderPath, { removeIfCanceled: true })) {
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const input = getRenameInput(model);
        if (!input) return;
        // Committing the unchanged seed name fires no rename callback and
        // would leave a phantom row, so start empty (VS Code style). The
        // rename editor is a controlled input — the DOM clear must be echoed
        // to the controller via an input event; select() backstops a miss.
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.select();
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
    if (event.target !== getTreeHost(model)) return;
    if (getRenameInput(model)) return;
    const focusedPath = model.getFocusedPath();
    if (!focusedPath) return;
    event.preventDefault();
    handleStartRename(focusedPath);
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
    >
      {/* Rendered outside the tree's shadow-DOM header slot on purpose: the
          tree's internal key/focus handlers sit between slotted content and
          the page, which breaks the inline create-folder input. */}
      <TreeHeader />
      <TreeSearchInput
        value={filter.searchValue}
        onChange={filter.onSearchChange}
      />
      {/* The main tree stays mounted while a filter query is active: the sync
          hooks keep mutating it invisibly, and expansion/selection/scroll all
          survive un-hiding when the query clears. */}
      <div className={cn('contents', filter.isFilterMode && 'hidden')}>
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
      {filter.isFilterMode && (
        <FilteredFileTree
          paths={filter.filteredPaths}
          isLoading={filter.isFilterLoading}
          hostStyle={hostStyle}
          routeTargetPath={routeTargetPath}
        />
      )}
    </div>
  );
}
