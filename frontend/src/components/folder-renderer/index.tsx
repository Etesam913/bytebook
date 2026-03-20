import { useAtomValue, useSetAtom } from 'jotai';
import { forwardRef } from 'react';
import { navigate } from 'wouter/use-browser-location';
import {
  VirtuosoGrid,
  type GridItemProps,
  type GridListProps,
  type ScrollerProps,
} from 'react-virtuoso';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getDefaultButtonVariants } from '../../animations';
import { fileTreeDataAtom, isNoteMaximizedAtom } from '../../atoms';
import { MotionIconButton } from '../buttons';
import { MaximizeNoteButton } from '../buttons/maximize-note';
import { Loader } from '../../icons/loader';
import { Magnifier } from '../../icons/magnifier';
import { GetChildrenOfFolderBasedOnLimit } from '../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { getTreeNodeFromPath } from '../virtualized/virtualized-file-tree/utils/file-tree-utils';
import { useToggleSidebarEvent } from '../../routes/notes-sidebar/render-note/hooks';
import { lastSearchQueryAtom } from '../../hooks/search';
import {
  type FolderPath,
  createFilePath,
  createFolderPath,
} from '../../utils/path';
import { FOLDER_TYPE } from '../virtualized/virtualized-file-tree/types';
import { NotFound } from '../../routes/not-found';
import { motion, type LegacyAnimationControls } from 'motion/react';
import { routeUrls } from '../../utils/routes';
import { Tooltip } from '../tooltip';
import { cn } from '../../utils/string-formatting';
import {
  FolderRendererCard,
  type FolderRendererItem,
} from './folder-renderer-card';
import { FolderRendererCreateItemCard } from './folder-renderer-create-item-card';

const folderGridComponents = {
  Scroller: forwardRef<HTMLDivElement, Omit<ScrollerProps, 'ref'>>(
    (
      {
        style,
        children,
        tabIndex,
        'data-testid': dataTestId,
        'data-virtuoso-scroller': dataVirtuosoScroller,
      },
      ref
    ) => (
      <div
        ref={ref}
        style={style}
        tabIndex={tabIndex}
        data-testid={dataTestId}
        data-virtuoso-scroller={dataVirtuosoScroller}
        className="h-full w-full overflow-y-auto"
      >
        {children}
      </div>
    )
  ),
  List: forwardRef<HTMLDivElement, Omit<GridListProps, 'ref'>>(
    ({ style, children, className, 'data-testid': dataTestId }, ref) => (
      <div
        ref={ref}
        style={style}
        data-testid={dataTestId}
        className={cn(
          'mx-auto grid max-w-6xl gap-3 px-8 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]',
          className
        )}
      >
        {children}
      </div>
    )
  ),
  Item: forwardRef<HTMLDivElement, Omit<GridItemProps, 'ref'>>(
    ({ children, className, style, 'data-index': dataIndex }, ref) => (
      <div ref={ref} className={className} style={style} data-index={dataIndex}>
        {children}
      </div>
    )
  ),
};

folderGridComponents.Scroller.displayName = 'FolderRendererGridScroller';
folderGridComponents.List.displayName = 'FolderRendererGridList';
folderGridComponents.Item.displayName = 'FolderRendererGridItem';

export function FolderRenderer({
  folderPath,
  animationControls,
}: {
  folderPath: FolderPath;
  animationControls: LegacyAnimationControls;
}) {
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const setLastSearchQuery = useSetAtom(lastSearchQueryAtom);
  const folderTreeNode = getTreeNodeFromPath(fileTreeData, folderPath.fullPath);
  useToggleSidebarEvent(animationControls);

  const folderId =
    folderTreeNode?.type === FOLDER_TYPE ? folderTreeNode.id : '';
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['folder-children', folderPath.fullPath],
    enabled: !!folderTreeNode && folderTreeNode.type === FOLDER_TYPE,
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      GetChildrenOfFolderBasedOnLimit(
        folderPath.fullPath,
        folderId,
        pageParam,
        300
      ),
    getNextPageParam: (lastPage) =>
      lastPage.data?.hasMore ? lastPage.data.nextCursor : undefined,
  });

  if (!folderTreeNode || folderTreeNode.type !== FOLDER_TYPE) {
    return <NotFound />;
  }

  const items: FolderRendererItem[] = (data?.pages ?? []).flatMap((page) => {
    const entries = page.data?.items ?? [];
    return entries.reduce<FolderRendererItem[]>((acc, entry) => {
      if (entry.type === 'folder') {
        const entryFolderPath = createFolderPath(entry.path);
        if (entryFolderPath) {
          acc.push({
            id: entry.id,
            type: 'folder',
            name: entry.name,
            path: entryFolderPath,
          });
        }
      } else {
        const entryFilePath = createFilePath(entry.path);
        if (entryFilePath) {
          acc.push({
            id: entry.id,
            type: 'file',
            name: entry.name,
            path: entryFilePath,
          });
        }
      }
      return acc;
    }, []);
  });

  const gridComponents = {
    ...folderGridComponents,
    Header: () => (
      <div className="space-y-3">
        <header
          className={cn(
            'flex w-full flex-col gap-1 pt-3 col-span-full',
            isNoteMaximized && 'pl-32'
          )}
        >
          <div className="flex gap-3 items-start">
            <MaximizeNoteButton animationControls={animationControls} />
            <div className="mt-1.5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Folder</p>
              <span className="flex items-center gap-2.5 mt-1">
                <h1 className="truncate text-2xl font-semibold dark:text-zinc-50">
                  {folderTreeNode.name}
                </h1>
                <Tooltip content="Search this folder">
                  <MotionIconButton
                    {...getDefaultButtonVariants()}
                    aria-label="Search this folder"
                    className="shrink-0"
                    onClick={() => {
                      setLastSearchQuery(`f:"${folderPath.fullPath}"`);
                      navigate(routeUrls.search());
                    }}
                  >
                    <Magnifier width={14} height={14} />
                  </MotionIconButton>
                </Tooltip>
              </span>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {folderTreeNode.path + '/'}
              </p>
            </div>
          </div>
        </header>
        <hr className="mx-4 text-zinc-200 dark:text-zinc-700 col-span-full" />
        <FolderRendererCreateItemCard folder={folderTreeNode} />
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
          <Loader width={20} height={20} />
        </motion.section>
      ) : (
        <section className="min-w-0 flex-1">
          <VirtuosoGrid
            style={{ height: '100%' }}
            data={items}
            computeItemKey={(_, item) => item.id}
            components={gridComponents}
            itemContent={(_, item) => <FolderRendererCard item={item} />}
            endReached={() => {
              if (hasNextPage) fetchNextPage();
            }}
          />
        </section>
      )}
    </motion.section>
  );
}
