import { useAtomValue, useSetAtom } from 'jotai';
import { type ComponentPropsWithoutRef, forwardRef, useEffect } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { VirtuosoGrid } from 'react-virtuoso';
import { getDefaultButtonVariants } from '../../animations';
import { fileTreeDataAtom } from '../../atoms';
import { MotionIconButton } from '../buttons';
import { Folder as FolderIcon } from '../../icons/folder';
import { Loader } from '../../icons/loader';
import { Magnifier } from '../../icons/magnifier';
import { RenderNoteIcon } from '../../icons/render-note-icon';
import { useOpenFolderMutation } from '../virtualized/virtualized-file-tree/hooks/open-folder';
import { lastSearchQueryAtom } from '../../hooks/search';
import {
  type FilePath,
  type FolderPath,
  createFilePath,
  createFolderPath,
} from '../../utils/path';
import {
  FILE_TYPE,
  FOLDER_TYPE,
} from '../virtualized/virtualized-file-tree/types';
import { NotFound } from '../../routes/not-found';
import { motion } from 'motion/react';
import { routeUrls } from '../../utils/routes';
import { Tooltip } from '../tooltip';

type RendererItem = {
  id: string;
  name: string;
};

type FolderRendererItem = RendererItem &
  (
    | {
        type: typeof FOLDER_TYPE;
        path: FolderPath;
      }
    | {
        type: typeof FILE_TYPE;
        path: FilePath;
      }
  );

const folderGridComponents = {
  Scroller: forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
    ({ style, children, ...props }, ref) => (
      <div
        ref={ref}
        {...props}
        style={style}
        className="h-full w-full overflow-y-auto"
      >
        {children}
      </div>
    )
  ),
  List: forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
    ({ style, children, ...props }, ref) => (
      <div
        ref={ref}
        {...props}
        style={style}
        className="mx-auto flex max-w-6xl flex-wrap px-4"
      >
        {children}
      </div>
    )
  ),
  Item: ({ children, ...props }: ComponentPropsWithoutRef<'div'>) => (
    <div {...props} className="flex w-full flex-none p-1.5 sm:w-1/2 xl:w-1/3">
      {children}
    </div>
  ),
};

folderGridComponents.Scroller.displayName = 'FolderRendererGridScroller';
folderGridComponents.List.displayName = 'FolderRendererGridList';

function FolderRendererCard({ item }: { item: FolderRendererItem }) {
  return (
    <button
      type="button"
      onClick={() =>
        navigate(
          item.type === 'folder'
            ? item.path.encodedFolderUrl
            : item.path.encodedFileUrl
        )
      }
      className="flex w-full items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-650 dark:bg-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-650"
    >
      <span className="mt-0.75">
        {item.type === 'folder' ? (
          <FolderIcon
            className="min-w-4 min-h-4"
            height={16}
            width={16}
            strokeWidth={1.75}
          />
        ) : (
          <RenderNoteIcon filePath={item.path} size="sm" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium leading-5 text-zinc-900 dark:text-zinc-50">
          {item.name}
        </span>
        <span className="block truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400">
          {item.path.fullPath}
        </span>
      </span>
    </button>
  );
}

export function FolderRenderer({ folderPath }: { folderPath: FolderPath }) {
  const { treeData, filePathToTreeDataId } = useAtomValue(fileTreeDataAtom);
  const setLastSearchQuery = useSetAtom(lastSearchQueryAtom);
  const routeFolderId = filePathToTreeDataId.get(folderPath.fullPath);
  const folderNode = routeFolderId ? treeData.get(routeFolderId) : null;
  const { mutate: openFolder, isPending: isOpeningFolder } =
    useOpenFolderMutation();

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

  const items: FolderRendererItem[] = folderNode.childrenIds.reduce<
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

  return (
    <section className="flex h-full flex-1 flex-col gap-4">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 pt-4.5">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Folder</p>
        <span className="flex items-center gap-2">
          <h1 className="min-w-0 truncate text-2xl font-semibold dark:text-zinc/hover-50">
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
              <Magnifier width={16} height={16} />
            </MotionIconButton>
          </Tooltip>
        </span>
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {folderNode.path + '/'}
        </p>
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
      ) : items.length === 0 ? (
        <section className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 pb-4.5">
          <article className="w-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50 h-full flex justify-center flex-col">
            <h2>This folder is empty.</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Files and folders in {' ' + folderNode.name} will appear here.
            </p>
          </article>
        </section>
      ) : (
        <section className="flex-1 min-h-0">
          <VirtuosoGrid
            style={{ height: '100%' }}
            totalCount={items.length}
            data={items}
            overscan={500}
            components={folderGridComponents}
            itemContent={(_, item) => <FolderRendererCard item={item} />}
          />
        </section>
      )}
    </section>
  );
}
