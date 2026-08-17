import { FileTree } from '@pierre/trees/react';
import { type RefObject, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { isDarkModeOnAtom } from '../../../atoms';
import { useMoveToTrashMutation } from '../../../hooks/notes';
import { splitPathSegments, stripTrailingSlash } from '../../../utils/path';
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
import { getRenameInput } from './model-utils';
import {
  ensureSharedModel,
  hasSharedModel,
  lastNavigated,
  markRenameStartFromKeyboardEvent,
  mutations,
  startTreeRename,
} from './shared-model';
import { FILE_TREE_HOST_STYLE } from './styles';
import { TreeContextMenu } from './tree-context-menu';
import { TreeHeader } from './tree-header';

/**
 * The sidebar file tree, backed by @pierre/trees. Initializes the model with
 * the complete vault path list from `GetAllPaths` so every nested folder and
 * note is immediately expandable and interactive.
 */
export function VirtualizedFileTree({
  ref,
}: {
  ref: RefObject<HTMLElement | null>;
}) {
  const allPathsQuery = useAllPaths();

  // Once the shared model exists it carries all the state the tree needs, so
  // never gate on the query again (a cache miss here would unmount the tree).
  if (!hasSharedModel() && !allPathsQuery.isSuccess) {
    return null;
  }

  return (
    <PierreFileTreeInner
      initialPaths={allPathsQuery.data ?? []}
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
  const routeTargetPath = usePierreRouteTargetPath();

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
    const segments = splitPathSegments(stripTrailingSlash(routeTargetPath));
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

  const allPaths = useSyncAllPaths(model);
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

  // F2 renames start inside @pierre/trees, so flag them during the capture
  // phase (which runs before the tree's own shadow-DOM handler) to keep the
  // rename's re-selection from navigating.
  function handleKeyDownCapture(event: React.KeyboardEvent) {
    if (event.key === 'F2') markRenameStartFromKeyboardEvent();
  }

  function handleStartRename(path: string) {
    if (!startTreeRename(path)) return;
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
