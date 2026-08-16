import { forwardRef, useRef } from 'react';
import {
  VirtuosoGrid,
  type GridItemProps,
  type GridListProps,
  type ScrollerProps,
} from 'react-virtuoso';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader } from '../../icons/loader';
import { GetChildrenOfFolderBasedOnLimit } from '../../../bindings/github.com/etesam913/bytebook/internal/services/filetreeservice';
import { useToggleSidebarEvent } from '../../routes/notes-sidebar/render-note/hooks';
import {
  type FolderPath,
  createFilePath,
  createFolderPath,
} from '../../utils/path';
import { NotFound } from '../../routes/not-found';
import { motion, type LegacyAnimationControls } from 'motion/react';
import { cn } from '../../utils/string-formatting';
import { queryKeys } from '../../utils/query-keys';
import {
  FolderRendererCard,
  type FolderRendererItem,
} from './folder-renderer-card';
import { FolderRendererCreateItemCard } from './folder-renderer-create-item-card';
import { FolderRendererHeader } from './folder-renderer-header';
import { usePreventBoundaryOverscrollFlicker } from '../virtualized/virtualized-list/hooks';

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
  useToggleSidebarEvent(animationControls);
  const internalListRef = useRef<HTMLElement | null>(null);
  usePreventBoundaryOverscrollFlicker({ scrollElementRef: internalListRef });

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: queryKeys.folderChildren(folderPath.fullPath),
    initialPageParam: '',
    // The parentId argument is only echoed back on the response items and is
    // unused here, so pass an empty string.
    queryFn: ({ pageParam }) =>
      GetChildrenOfFolderBasedOnLimit(folderPath.fullPath, '', pageParam, 300),
    getNextPageParam: (lastPage) =>
      lastPage.data?.hasMore ? lastPage.data.nextCursor : undefined,
  });

  // The backend responds with success: false when the folder doesn't exist.
  const firstPage = data?.pages[0];
  if (firstPage && !firstPage.success) {
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
            endReached={() => {
              if (hasNextPage) void fetchNextPage();
            }}
          />
        </section>
      )}
    </motion.section>
  );
}
