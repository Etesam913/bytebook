import { prepareFileTreeInput } from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { addAncestorDirectoryPaths } from '@utils/search';
import { navigateToTreePath } from './model-utils';
import { FILE_TREE_UNSAFE_CSS } from './styles';

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
  isLoading,
  hostStyle,
  routeTargetPath,
}: {
  paths: string[] | undefined;
  isLoading: boolean;
  hostStyle: React.CSSProperties;
  routeTargetPath: string | null;
}) {
  if (isLoading && !paths) {
    return <TreeMessage>Searching…</TreeMessage>;
  }
  if (!paths || paths.length === 0) {
    return <TreeMessage>No matching files.</TreeMessage>;
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
    icons: 'minimal',
    unsafeCSS: FILE_TREE_UNSAFE_CSS,
    onSelectionChange: (selectedPaths) => {
      if (selectedPaths.length !== 1) return;
      navigateToTreePath(selectedPaths[0]);
    },
  });

  return <FileTree model={model} style={hostStyle} />;
}
