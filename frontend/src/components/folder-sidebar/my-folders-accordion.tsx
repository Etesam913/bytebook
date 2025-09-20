import { AnimatePresence, motion } from 'motion/react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getDefaultButtonVariants } from '../../animations';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  selectionRangeAtom,
} from '../../atoms';
import { draggedElementAtom } from '../editor/atoms';
import {
  useFolderRenameMutation,
  useFolderDeleteMutation,
  useFolderRevealInFinderMutation,
  useFolders,
  useMoveNoteIntoFolder,
} from '../../hooks/folders';
import { Finder } from '../../icons/finder';
import { Folder } from '../../icons/folder';
import { FolderOpen } from '../../icons/folder-open';
import { FolderPen } from '../../icons/folder-pen';
import { FolderRefresh } from '../../icons/folder-refresh';
import { Loader } from '../../icons/loader';
import { Trash } from '../../icons/trash';
import { BYTEBOOK_DRAG_DATA_FORMAT } from '../../utils/draggable';
import {
  handleKeyNavigation,
  handleContextMenuSelection,
} from '../../utils/selection';
import { cn } from '../../utils/string-formatting';
import { MotionButton } from '../buttons';
import { Sidebar } from '../sidebar';
import { AccordionButton } from '../sidebar/accordion-button';
import { handleDragStart } from '../sidebar/utils';
import {
  RenameFolderDialog,
  DeleteFolderDialog,
} from './folder-dialog-children';
import { navigate } from 'wouter/use-browser-location';
import { useLocation } from 'wouter';
import {
  ROUTE_PATTERNS,
  routeUrls,
  type NotesRouteParams,
} from '../../utils/routes';
import { currentZoomAtom } from '../../hooks/resize';
import { useRoute } from 'wouter';
import { useFolderFromRoute } from '../../hooks/events';
import { findClosestSidebarItemToNavigateTo } from '../../utils/routing';

export function MyFoldersAccordion() {
  const [isOpen, setIsOpen] = useState(true);
  const { data, isLoading, isError, refetch, error } = useFolders();
  const alphabetizedFolders = data?.alphabetizedFolders ?? null;
  const previousFolders = data?.previousAlphabetizedFolders ?? null;
  const currentFolder = useFolderFromRoute();
  const [location] = useLocation();

  if (isError) {
    console.error(error);
  }

  useEffect(() => {
    // Don't perform navigation logic if we're already on the 404 page
    if (location === routeUrls.patterns.NOT_FOUND_FALLBACK) {
      return;
    }

    if (alphabetizedFolders && alphabetizedFolders.length > 0) {
      const isCurrentFolderInAlphabetizedFolders =
        alphabetizedFolders.some((folder) => folder === currentFolder) ?? false;

      // If on the root route, navigate to the first folder
      if (!currentFolder) {
        navigate(routeUrls.folder(alphabetizedFolders[0]), { replace: true });
      }
      // If you are on a folder that does not exist navigate to 404 page
      else if (!isCurrentFolderInAlphabetizedFolders) {
        if (!previousFolders || !previousFolders.includes(currentFolder)) {
          navigate(routeUrls.patterns.NOT_FOUND_FALLBACK, { replace: true });
        } else {
          const closestFolder = findClosestSidebarItemToNavigateTo(
            currentFolder,
            previousFolders,
            alphabetizedFolders
          );
          if (
            closestFolder >= 0 &&
            closestFolder < alphabetizedFolders.length
          ) {
            navigate(routeUrls.folder(alphabetizedFolders[closestFolder]), {
              replace: true,
            });
          } else {
            navigate(routeUrls.patterns.NOT_FOUND_FALLBACK, { replace: true });
          }
        }
      }
    }
  }, [alphabetizedFolders, currentFolder, previousFolders]);

  return (
    <section>
      <AccordionButton
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        icon={<Folder width={20} height={20} strokeWidth={1.75} />}
        title={
          <>
            Folders{' '}
            {alphabetizedFolders && alphabetizedFolders.length > 0 && (
              <span className="tracking-wider">
                ({alphabetizedFolders.length})
              </span>
            )}
          </>
        }
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{
              height: 'auto',
              transition: { type: 'spring', damping: 16 },
            }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden hover:overflow-auto pl-1"
          >
            {isError && (
              <div className="text-center text-xs my-3 flex flex-col items-center gap-2 text-balance">
                <p className="text-red-500">
                  Something went wrong when fetching the folders
                </p>
                <MotionButton
                  {...getDefaultButtonVariants({ disabled: false, whileHover: 1.025, whileTap: 0.975, whileFocus: 1.025 })}
                  className="mx-2.5 flex text-center"
                  onClick={() => refetch()}
                >
                  <span>Retry</span>{' '}
                  <FolderRefresh
                    className="will-change-transform"
                    width={16}
                    height={16}
                  />
                </MotionButton>
              </div>
            )}
            {!isError &&
              (isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <Loader width={20} height={20} className="mx-auto my-3" />
                </motion.div>
              ) : (
                <Sidebar<string>
                  contentType="folder"
                  layoutId="folder-sidebar"
                  emptyElement={
                    <li className="text-center list-none text-zinc-500 dark:text-zinc-300 text-xs">
                      Create a folder with the &quot;Create Folder&quot; button
                      above
                    </li>
                  }
                  dataItemToString={(folderName) => folderName}
                  dataItemToSelectionRangeEntry={(folderName) => folderName}
                  renderLink={({ dataItem: sidebarFolderName, i }) => {
                    return (
                      <FolderAccordionButton
                        sidebarFolderName={sidebarFolderName}
                        i={i}
                        alphabetizedFolders={alphabetizedFolders}
                      />
                    );
                  }}
                  data={alphabetizedFolders}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function FolderAccordionButton({
  sidebarFolderName,
  i,
  alphabetizedFolders,
}: {
  sidebarFolderName: string;
  i: number;
  alphabetizedFolders: string[] | null;
}) {
  const folderFromButton = alphabetizedFolders?.at(i);
  const folder = useFolderFromRoute();
  const [isNotesRouteActive] = useRoute<NotesRouteParams>(ROUTE_PATTERNS.NOTES);
  const isActive = isNotesRouteActive && folder === sidebarFolderName;

  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const isSelected = selectionRange.has(`folder:${folderFromButton}`);

  const setDraggedElement = useSetAtom(draggedElementAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const setDialogData = useSetAtom(dialogDataAtom);

  const { mutate: revealInFinder } = useFolderRevealInFinderMutation();
  const { mutateAsync: renameFolder } = useFolderRenameMutation();
  const { mutateAsync: deleteFolder } = useFolderDeleteMutation();
  const { mutateAsync: moveNoteIntoFolder } = useMoveNoteIntoFolder();

  const currentZoom = useAtomValue(currentZoomAtom);

  const [isDraggedOver, setIsDraggedOver] = useState(false);

  return (
    <button
      type="button"
      draggable
      onDrop={(e) => {
        setIsDraggedOver(false);
        if (!e.dataTransfer.types.includes(BYTEBOOK_DRAG_DATA_FORMAT)) return;
        const jsonString = e.dataTransfer.getData(BYTEBOOK_DRAG_DATA_FORMAT);
        try {
          const data = JSON.parse(jsonString);
          if (!data?.fileData) throw new Error();
          moveNoteIntoFolder({
            backendNotePaths: data.fileData.map(
              ({
                folder,
                note,
                extension,
              }: {
                folder: string;
                note: string;
                extension: string;
              }) => {
                return `${folder}/${note}.${extension}`;
              }
            ),
            newFolder: sidebarFolderName,
          });
        } catch {
          toast.error(`Failed to move to ${sidebarFolderName}/`);
        }
      }}
      onDragLeave={() => {
        setIsDraggedOver(false);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(BYTEBOOK_DRAG_DATA_FORMAT)) {
          e.preventDefault();
          setIsDraggedOver(true);
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDragStart={(e) =>
        handleDragStart({
          e,
          setSelectionRange,
          contentType: 'folder',
          draggedItem: alphabetizedFolders?.at(i) ?? '',
          setDraggedElement,
        })
      }
      onKeyDown={(e) => handleKeyNavigation(e)}
      className={cn(
        'list-sidebar-item',
        isActive && 'bg-zinc-150 dark:bg-zinc-700',
        (isSelected || isDraggedOver) && 'bg-(--accent-color)! text-white'
      )}
      onClick={(e) => {
        if (e.metaKey || e.shiftKey) return;
        (e.target as HTMLButtonElement).focus();
        navigate(routeUrls.folder(sidebarFolderName));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'folder',
          itemName: sidebarFolderName,
        });
        setContextMenuData({
          x: e.clientX / currentZoom,
          y: e.clientY / currentZoom,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Finder
                    width={17}
                    height={17}
                    className="will-change-transform"
                  />{' '}
                  <span className="will-change-transform">
                    Reveal In Finder
                  </span>
                </span>
              ),
              value: 'reveal-in-finder',
              onChange: () =>
                revealInFinder({ selectionRange: newSelectionRange }),
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <FolderPen
                    width={17}
                    height={17}
                    className="will-change-transform"
                  />{' '}
                  <span className="will-change-transform">Rename Folder</span>
                </span>
              ),
              value: 'rename-folder',
              onChange: () => {
                setDialogData({
                  isOpen: true,
                  isPending: true,
                  title: 'Rename Folder',
                  children: (errorText) => (
                    <RenameFolderDialog
                      errorText={errorText}
                      folderName={sidebarFolderName}
                    />
                  ),
                  onSubmit: async (evt, setErrorText) =>
                    renameFolder({
                      e: evt,
                      setErrorText,
                      folderFromSidebar: sidebarFolderName,
                    }),
                });
              },
            },
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Trash
                    width={17}
                    height={17}
                    className="will-change-transform"
                  />{' '}
                  <span className="will-change-transform">Move to Trash</span>
                </span>
              ),
              value: 'move-to-trash',
              onChange: () => {
                setDialogData({
                  isOpen: true,
                  title: 'Move to Trash',
                  isPending: false,
                  children: (errorText) => (
                    <DeleteFolderDialog
                      errorText={errorText}
                      folderName={sidebarFolderName}
                    />
                  ),
                  onSubmit: async (_, setErrorText) =>
                    deleteFolder({
                      setErrorText,
                      folderFromSidebar: sidebarFolderName,
                    }),
                });
              },
            },
          ],
        });
      }}
    >
      {isActive ? (
        <FolderOpen
          title=""
          className="min-w-[18px] pointer-events-none"
          width={18}
          height={18}
          strokeWidth={1.7}
        />
      ) : (
        <Folder
          title=""
          className="min-w-[18px] pointer-events-none"
          width={18}
          height={18}
          strokeWidth={1.7}
        />
      )}
      <p className="whitespace-nowrap text-ellipsis overflow-hidden pointer-events-none">
        {sidebarFolderName}
      </p>
    </button>
  );
}
