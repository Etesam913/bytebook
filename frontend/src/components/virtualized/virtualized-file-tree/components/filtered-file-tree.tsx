import { useRef, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { createFilePath } from '@utils/path';
import { cn } from '@utils/string-formatting';
import { prepareFileTreeInput } from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { FILE_TREE_ICONS } from './icons';
import { addAncestorDirectoryPaths } from '@utils/search';
import { Loader } from '@/icons/loader';
import { RenderNoteIcon } from '@/icons/render-note-icon';
import { navigateToTreePath } from '../model/model-utils';
import { FILE_TREE_UNSAFE_CSS } from '../styles';
import { usePierreRowHeight } from '../hooks/use-pierre-row-height';
import { TreeNameTooltip } from './tree-name-tooltip';

function TreeMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
      {children}
    </div>
  );
}

// The ephemeral tree shown while a filter-syntax query is active. Navigation
// only: renaming, drag-and-drop, and the context menu live on the canonical
// tree, which stays mounted (hidden) with its state intact.
export function FilteredFileTree({
  paths,
  isSorted,
  isLoading,
  hostStyle,
  routeTargetPath,
}: {
  paths: string[] | undefined;
  isSorted: boolean;
  isLoading: boolean;
  hostStyle: React.CSSProperties;
  routeTargetPath: string | null;
}) {
  if (isLoading && !paths) {
    return (
      <div className="flex justify-center py-3 text-zinc-500 dark:text-zinc-400">
        <Loader width="1.25rem" height="1.25rem" />
      </div>
    );
  }
  if (!paths || paths.length === 0) {
    return <TreeMessage>No matching files</TreeMessage>;
  }
  if (isSorted) {
    return (
      <SortedFileResults paths={paths} routeTargetPath={routeTargetPath} />
    );
  }
  const treePaths = addAncestorDirectoryPaths(paths);
  return (
    // The key remounts a fresh ephemeral model per result set — filtered sets
    // are small, rebuild is cheap, and it sidesteps model diffing entirely.
    <FilteredTreeHost
      key={treePaths.join('\n')}
      treePaths={treePaths}
      hostStyle={hostStyle}
      routeTargetPath={routeTargetPath}
    />
  );
}

function FilteredTreeHost({
  treePaths,
  hostStyle,
  routeTargetPath,
}: {
  treePaths: string[];
  hostStyle: React.CSSProperties;
  routeTargetPath: string | null;
}) {
  const { model } = useFileTree({
    preparedInput: prepareFileTreeInput(treePaths),
    initialExpansion: 'open',
    initialSelectedPaths: routeTargetPath ? [routeTargetPath] : [],
    // Match the canonical tree so both index rows the same way.
    flattenEmptyDirectories: false,
    stickyFolders: true,
    icons: FILE_TREE_ICONS,
    unsafeCSS: FILE_TREE_UNSAFE_CSS,
    onSelectionChange: (selectedPaths) => {
      if (selectedPaths.length !== 1) return;
      navigateToTreePath(selectedPaths[0]);
    },
  });

  usePierreRowHeight(model);

  return (
    <>
      <FileTree model={model} style={hostStyle} />
      <TreeNameTooltip model={model} />
    </>
  );
}

function SortedFileResults({
  paths,
  routeTargetPath,
}: {
  paths: string[];
  routeTargetPath: string | null;
}) {
  const listRef = useRef<VirtuosoHandle>(null);
  const linksRef = useRef(new Map<string, HTMLAnchorElement>());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const tabStopPath =
    focusedPath && paths.includes(focusedPath)
      ? focusedPath
      : routeTargetPath && paths.includes(routeTargetPath)
        ? routeTargetPath
        : paths[0];

  return (
    <Virtuoso
      ref={listRef}
      role="navigation"
      aria-label="Sorted files"
      data={paths}
      overscan={{ main: 300, reverse: 300 }}
      style={{ height: 0, flexGrow: 1 }}
      computeItemKey={(_, path) => path}
      itemContent={(index, path) => {
        const filePath = createFilePath(path);
        if (!filePath) return null;
        const isActive = path === routeTargetPath;
        return (
          <a
            ref={(node) => {
              if (node) linksRef.current.set(path, node);
              else linksRef.current.delete(path);
            }}
            tabIndex={path === tabStopPath ? 0 : -1}
            onFocus={() => setFocusedPath(path)}
            onClick={(event) => {
              event.preventDefault();
              navigateToTreePath(path);
            }}
            onKeyDown={(event) => {
              if (event.altKey || event.ctrlKey || event.metaKey) return;
              let nextIndex: number;
              switch (event.key) {
                case ' ':
                  event.preventDefault();
                  event.currentTarget.click();
                  return;
                case 'ArrowDown':
                  nextIndex = Math.min(index + 1, paths.length - 1);
                  break;
                case 'ArrowUp':
                  nextIndex = Math.max(index - 1, 0);
                  break;
                case 'Home':
                  nextIndex = 0;
                  break;
                case 'End':
                  nextIndex = paths.length - 1;
                  break;
                default:
                  return;
              }
              event.preventDefault();
              const nextPath = paths[nextIndex];
              setFocusedPath(nextPath);
              listRef.current?.scrollIntoView({
                index: nextIndex,
                done: () =>
                  linksRef.current
                    .get(nextPath)
                    ?.focus({ preventScroll: true }),
              });
            }}
            href={filePath.encodedFileUrl}
            aria-current={isActive ? 'page' : undefined}
            title={path}
            className={cn(
              'flex cursor-default items-center gap-1.5 px-2 py-1 text-sm transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--accent-color)',
              isActive
                ? 'bg-(--accent-color) text-white'
                : 'hover:bg-[color-mix(in_lab,var(--accent-color)_8%,rgb(252,252,252))] dark:hover:bg-[color-mix(in_lab,var(--accent-color)_10%,rgb(39,39,42))]'
            )}
          >
            <span aria-hidden="true" className="shrink-0">
              <RenderNoteIcon filePath={filePath} size="sm" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{filePath.note}</span>
              <span
                className={cn(
                  'block truncate text-xs',
                  isActive
                    ? 'text-white/85'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                {filePath.folder || '/'}
              </span>
            </span>
          </a>
        );
      }}
    />
  );
}
