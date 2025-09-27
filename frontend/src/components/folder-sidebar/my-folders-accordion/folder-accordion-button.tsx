import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  selectionRangeAtom,
} from '../../../atoms';
import { draggedElementAtom } from '../../editor/atoms';
import {
  useFolderRenameMutation,
  useFolderDeleteMutation,
  useMoveNoteIntoFolder,
  useFolderRevealInFinderMutation,
} from '../../../hooks/folders';
import { Finder } from '../../../icons/finder';
import { Folder } from '../../../icons/folder';
import { FolderOpen } from '../../../icons/folder-open';
import { FolderPen } from '../../../icons/folder-pen';
import { Trash } from '../../../icons/trash';
import { BYTEBOOK_DRAG_DATA_FORMAT } from '../../../utils/draggable';
import {
  handleKeyNavigation,
  handleContextMenuSelection,
} from '../../../utils/selection';
import { cn } from '../../../utils/string-formatting';
import { handleDragStart } from '../../sidebar/utils';
import {
  RenameFolderDialog,
  DeleteFolderDialog,
} from './folder-dialog-children';
import { navigate } from 'wouter/use-browser-location';
import {
  ROUTE_PATTERNS,
  routeUrls,
  type NotesRouteParams,
} from '../../../utils/routes';
import { currentZoomAtom } from '../../../hooks/resize';
import { useRoute } from 'wouter';
import { useFolderFromRoute } from '../../../hooks/events';

export function FolderAccordionButton({
  sidebarFolderName,
  i,
  alphabetizedFolders,
}: {
  sidebarFolderName: string;
  i: number;
  alphabetizedFolders: string[] | null;
}) {
  const folderFromButton = alphabetizedFolders?.at(i);
  const { folder } = useFolderFromRoute();
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
