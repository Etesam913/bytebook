import { useAtomValue, useSetAtom } from 'jotai';
import { type ComponentPropsWithoutRef, forwardRef, useEffect } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { VirtuosoGrid } from 'react-virtuoso';
import { getDefaultButtonVariants } from '../../animations';
import { fileTreeDataAtom, isNoteMaximizedAtom } from '../../atoms';
import { MotionIconButton } from '../buttons';
import { MaximizeNoteButton } from '../buttons/maximize-note';
import { Loader } from '../../icons/loader';
import { Magnifier } from '../../icons/magnifier';
import { useOpenFolderMutation } from '../virtualized/virtualized-file-tree/hooks/open-folder';
import { useToggleSidebarEvent } from '../../routes/notes-sidebar/render-note/hooks';
import { lastSearchQueryAtom } from '../../hooks/search';
import {
  type FolderPath,
  createFilePath,
  createFolderPath,
} from '../../utils/path';
import {
  FOLDER_TYPE,
  type Folder,
} from '../virtualized/virtualized-file-tree/types';
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

const folderGridListClassName = 'mx-auto flex max-w-6xl flex-wrap gap-3 px-8';
const folderGridItemClassName =
  'flex w-full flex-none sm:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]';

const folderGridComponents = {
  Scroller: forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
    ({ style, children, ...props }, ref) => (
      <div
        ref={ref}
        {...props}
        style={style}
        className="h-full w-full overflow-y-auto [scrollbar-gutter:stable_both-edges]"
      >
        {children}
      </div>
    )
  ),
  List: forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
    ({ style, children, ...props }, ref) => {
      return (
        <div
          ref={ref}
          {...props}
          style={style}
          className={folderGridListClassName}
        >
          {children}
        </div>
      );
    }
  ),
  Item: ({ children, ...props }: ComponentPropsWithoutRef<'div'>) => (
    <div {...props} className={folderGridItemClassName}>
      {children}
    </div>
  ),
};

folderGridComponents.Scroller.displayName = 'FolderRendererGridScroller';
folderGridComponents.List.displayName = 'FolderRendererGridList';

export function FolderRenderer({
  folderPath,
  animationControls,
}: {
  folderPath: FolderPath;
  animationControls: LegacyAnimationControls;
}) {
  const { treeData, filePathToTreeDataId } = useAtomValue(fileTreeDataAtom);
  const isNoteMaximized = useAtomValue(isNoteMaximizedAtom);
  const setLastSearchQuery = useSetAtom(lastSearchQueryAtom);
  const routeFolderId = filePathToTreeDataId.get(folderPath.fullPath);
  const folderNode = routeFolderId ? treeData.get(routeFolderId) : null;
  const { mutate: openFolder, isPending: isOpeningFolder } =
    useOpenFolderMutation();
  useToggleSidebarEvent(animationControls);

  const hasResolvedTreeData = filePathToTreeDataId.size > 0;
  const hasLoadedChildren =
    folderNode?.type === FOLDER_TYPE &&
    (folderNode.isOpen ||
      folderNode.childrenIds.length > 0 ||
      folderNode.hasMoreChildren ||
      folderNode.childrenCursor !== null);
  const isLoadingChildren = Boolean(
    folderNode?.type === FOLDER_TYPE && !hasLoadedChildren
  );

  useEffect(() => {
    if (!folderNode || folderNode.type !== FOLDER_TYPE || hasLoadedChildren) {
      return;
    }

    openFolder({
      pathToFolder: folderNode.path,
      folderId: folderNode.id,
    });
  }, [folderNode, hasLoadedChildren, openFolder]);

  if (!hasResolvedTreeData) {
    return null;
  }

  if (!folderNode || folderNode.type !== FOLDER_TYPE) {
    return <NotFound />;
  }

  const currentFolderNode: Folder = folderNode;

  const items: FolderRendererItem[] = currentFolderNode.childrenIds.reduce<
    FolderRendererItem[]
  >((acc, childId) => {
    const child = treeData.get(childId);
    if (!child) {
      return acc;
    }

    if (child.type === 'folder') {
      const childFolderPath = createFolderPath(child.path);
      if (!childFolderPath) {
        return acc;
      }

      acc.push({
        id: child.id,
        type: 'folder',
        name: child.name,
        path: childFolderPath,
      });
      return acc;
    }

    const childFilePath = createFilePath(child.path);
    if (!childFilePath) {
      return acc;
    }

    acc.push({
      id: child.id,
      type: 'file',
      name: child.name,
      path: childFilePath,
    });
    return acc;
  }, []);

  const gridComponents = {
    ...folderGridComponents,
    Header: () => <FolderRendererCreateItemCard folder={currentFolderNode} />,
  };

  return (
    <motion.section
      className="flex h-full flex-1 flex-col gap-5 w-full"
      animate={animationControls}
    >
      <header
        className={cn(
          'flex w-full flex-col gap-1 pt-3',
          isNoteMaximized && 'pl-22'
        )}
      >
        <div className="flex gap-3 items-start min-w-6xl mx-auto">
          <MaximizeNoteButton animationControls={animationControls} />
          <div className="mt-1.5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Folder</p>
            <span className="flex items-center gap-2.5 mt-1">
              <h1 className="truncate text-2xl font-semibold dark:text-zinc/hover-50">
                {folderNode.name}
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
              {folderNode.path + '/'}
            </p>
          </div>
        </div>
      </header>
      <hr className="mx-4 text-zinc-200 dark:text-zinc-700" />

      {isLoadingChildren || isOpeningFolder ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-[25%] flex flex-1 items-center justify-center"
        >
          <Loader width={20} height={20} />
        </motion.section>
      ) : (
        <section className="flex-1 pb-4">
          <VirtuosoGrid
            style={{ height: '100%' }}
            totalCount={items.length}
            data={items}
            overscan={500}
            components={gridComponents}
            itemContent={(_, item) => <FolderRendererCard item={item} />}
            endReached={() => {
              openFolder({
                pathToFolder: folderNode.path,
                folderId: folderNode.id,
                isLoadMore: true,
              });
            }}
          />
        </section>
      )}
    </motion.section>
  );
}
