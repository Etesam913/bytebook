import { useRef } from 'react';
import {
  VirtuosoGrid,
  type GridItemProps,
  type GridListProps,
  type ScrollerProps,
} from 'react-virtuoso';
import { Loader } from '../../icons/loader';
import { useToggleSidebarEvent } from '../../routes/notes-sidebar/render-note/hooks';
import {
  type FolderPath,
  createFilePath,
  createFolderPath,
  stripTrailingSlash,
} from '../../utils/path';
import { NotFound } from '../../routes/not-found';
import { motion, type LegacyAnimationControls } from 'motion/react';
import { cn } from '../../utils/string-formatting';
import { useAllPaths } from '../../hooks/all-paths';
import { FILE_TYPE, FOLDER_TYPE } from '../../utils/tree-item-types';
import {
  FolderRendererCard,
  type FolderRendererItem,
} from './folder-renderer-card';
import { FolderRendererCreateItemCard } from './folder-renderer-create-item-card';
import { FolderRendererHeader } from './folder-renderer-header';
import { usePreventBoundaryOverscrollFlicker } from '../virtualized/virtualized-list/hooks';

const folderGridComponents = {
  Scroller: ({ children, ...props }: ScrollerProps) => (
    <div {...props} className="h-full w-full overflow-y-auto">
      {children}
    </div>
  ),
  List: ({ children, className, ...props }: GridListProps) => (
    <div
      {...props}
      className={cn(
        'mx-auto grid max-w-6xl gap-3 px-8 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]',
        className
      )}
    >
      {children}
    </div>
  ),
  Item: ({ children, ...props }: GridItemProps) => (
    <div {...props}>{children}</div>
  ),
};

/**
 * Extracts the direct children of `folderPath` from the full vault path list
 * (already in tree display order — folders carry a trailing slash).
 */
function getFolderItems(
  allPaths: readonly string[],
  folderPath: FolderPath
): FolderRendererItem[] {
  const childPrefix = folderPath.fullPath;
  return allPaths.flatMap((path): FolderRendererItem[] => {
    const trimmed = stripTrailingSlash(path);
    if (!trimmed.startsWith(childPrefix)) return [];
    // Direct children only — deeper descendants contain another slash.
    if (trimmed.slice(childPrefix.length).includes('/')) return [];

    if (path.endsWith('/')) {
      const entryFolderPath = createFolderPath(trimmed);
      if (!entryFolderPath) return [];
      return [
        {
          id: path,
          type: FOLDER_TYPE,
          name: entryFolderPath.folder,
          path: entryFolderPath,
        },
      ];
    }
    const entryFilePath = createFilePath(trimmed);
    if (!entryFilePath) return [];
    return [
      {
        id: path,
        type: FILE_TYPE,
        name: entryFilePath.note,
        path: entryFilePath,
      },
    ];
  });
}

/**
 * Renders a folder's direct children as a card grid. The items come straight
 * from the same `GetAllPaths` query that feeds the sidebar tree (invalidated
 * by `useAllPathsInvalidation` on every file-watcher event), so there is no
 * per-folder pagination or fetching to manage.
 */
export function FolderRenderer({
  folderPath,
  animationControls,
}: {
  folderPath: FolderPath;
  animationControls: LegacyAnimationControls;
}) {
  useToggleSidebarEvent(animationControls);
  const internalListRef = useRef<HTMLElement | null>(null);
  usePreventBoundaryOverscrollFlicker({ scrollElementRef: internalListRef });

  const { data: allPaths, isLoading } = useAllPaths();

  if (allPaths && !allPaths.includes(folderPath.fullPath)) {
    return <NotFound />;
  }

  const items = getFolderItems(allPaths ?? [], folderPath);

  const gridComponents = {
    ...folderGridComponents,
    Header: () => (
      <div className="space-y-3">
        <FolderRendererHeader
          folderPath={folderPath}
          animationControls={animationControls}
        />
        <FolderRendererCreateItemCard folderPath={folderPath} />
      </div>
    ),
  };

  return (
    <motion.section
      className="flex h-full flex-1 flex-col w-full"
      animate={animationControls}
    >
      {isLoading ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-[25%] flex flex-1 items-center justify-center"
        >
          <Loader width="1.25rem" height="1.25rem" />
        </motion.section>
      ) : (
        <section className="min-w-0 flex-1">
          <VirtuosoGrid
            scrollerRef={(node) => {
              const element = node instanceof HTMLElement ? node : null;
              internalListRef.current = element;
            }}
            style={{ height: '100%' }}
            data={items}
            computeItemKey={(_, item) => item.id}
            components={gridComponents}
            itemContent={(_, item) => <FolderRendererCard item={item} />}
          />
        </section>
      )}
    </motion.section>
  );
}
