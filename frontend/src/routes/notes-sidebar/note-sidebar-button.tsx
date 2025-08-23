import { useAtomValue, useSetAtom } from 'jotai/react';
import { type Dispatch, type SetStateAction } from 'react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  projectSettingsAtom,
} from '../../atoms';
import { draggedElementAtom } from '../../components/editor/atoms';
import { handleDragStart } from '../../components/sidebar/utils';
import {
  useEditTagsMutation,
  useMoveNoteToTrashMutation,
  useNotePreviewQuery,
  useNoteRevealInFinderMutation,
  usePinNotesMutation,
  useRenameFileMutation,
} from '../../hooks/notes';
import { Finder } from '../../icons/finder';
import { FilePen } from '../../icons/file-pen';
import { PinTack2 } from '../../icons/pin-tack-2';
import { PinTackSlash } from '../../icons/pin-tack-slash';
import TagPlus from '../../icons/tag-plus';
import { Trash } from '../../icons/trash';
import { IMAGE_FILE_EXTENSIONS } from '../../types';
import { FILE_SERVER_URL } from '../../utils/general';
import { useSearchParamsEntries } from '../../utils/routing';
import {
  getFolderAndNoteFromSelectionRange,
  handleKeyNavigation,
  handleContextMenuSelection,
} from '../../utils/selection';
import { cn, FilePath } from '../../utils/string-formatting';
import { CardNoteSidebarItem } from './card-note-sidebar-item';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';
import { EditTagDialogChildren } from './edit-tag-dialog-children';
import { RenameFileDialogChildren } from './rename-file-dialog-children';
import { currentZoomAtom } from '../../hooks/resize';

export function NoteSidebarButton({
  sidebarNotePath,
  activeNoteNameWithoutExtension,
  sidebarNoteIndex,
  selectionRange,
  setSelectionRange,
  tagState,
}: {
  sidebarNotePath: FilePath;
  activeNoteNameWithoutExtension: string | undefined;
  sidebarNoteIndex: number;
  selectionRange: Set<string>;
  setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  tagState?: {
    tagName: string;
  };
}) {
  const sidebarNoteFolder = sidebarNotePath.folder;
  const sidebarNoteName = sidebarNotePath.noteWithExtensionParam;
  const sidebarNoteNameWithoutExtension = sidebarNotePath.noteWithoutExtension;
  const sidebarNoteExtension = sidebarNotePath.noteExtension;

  const isInTagsSidebar = tagState?.tagName !== undefined;
  const { mutate: pinOrUnpinNote } = usePinNotesMutation(isInTagsSidebar);
  const { mutate: revealInFinder } =
    useNoteRevealInFinderMutation(isInTagsSidebar);
  const { mutate: moveToTrash } = useMoveNoteToTrashMutation(isInTagsSidebar);
  const { mutateAsync: editTags } = useEditTagsMutation();
  const { mutateAsync: renameFile } = useRenameFileMutation();
  const currentZoom = useAtomValue(currentZoomAtom);

  const setDialogData = useSetAtom(dialogDataAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setDraggedElement = useSetAtom(draggedElementAtom);
  const searchParams: { ext?: string } = useSearchParamsEntries();

  const activeNoteNameWithExtension = `${activeNoteNameWithoutExtension}?ext=${searchParams.ext}`;

  const { data: notePreviewResult } = useNotePreviewQuery(sidebarNotePath);

  const notePreviewResultData = notePreviewResult?.data;
  const firstImageSrc = notePreviewResultData?.firstImageSrc ?? '';
  const isImageFile = IMAGE_FILE_EXTENSIONS.includes(sidebarNoteExtension);
  const imgSrc =
    !notePreviewResultData || firstImageSrc === ''
      ? isImageFile
        ? `${FILE_SERVER_URL}/notes/${sidebarNoteFolder}/${sidebarNotePath.note}`
        : ''
      : firstImageSrc;

  const isActive =
    decodeURIComponent(activeNoteNameWithExtension) === sidebarNoteName;

  /*
		The SidebarItems container component adds the folder name and the note name to the selection range
		when a note is selected in the tags note sidebar. Therefore, selections via this comopnent should
		follow this pattern for the tags note sidebar.
	*/
  const noteNameForSelection = isInTagsSidebar
    ? `${sidebarNoteFolder}/${sidebarNoteName}`
    : sidebarNoteName;

  const isSelected =
    selectionRange.has(`note:${noteNameForSelection}`) ?? false;

  return (
    <button
      type="button"
      title={sidebarNoteName}
      draggable
      id={isActive ? 'selected-note-button' : undefined}
      onKeyDown={(e) => handleKeyNavigation(e)}
      onDragStart={(e) =>
        handleDragStart({
          e,
          setSelectionRange,
          contentType: 'note',
          draggedItem: noteNameForSelection,
          setDraggedElement,
          folder: sidebarNoteFolder,
          isInTagsSidebar,
        })
      }
      onContextMenu={(e) => {
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'note',
          itemName: noteNameForSelection,
        });
        const folderAndNoteNames = getFolderAndNoteFromSelectionRange(
          sidebarNoteFolder,
          newSelectionRange,
          isInTagsSidebar
        );
        const isShowingPinOption = folderAndNoteNames.some(
          (folderAndNoteName) =>
            !projectSettings.pinnedNotes.has(folderAndNoteName)
        );
        const isShowingUnpinOption = folderAndNoteNames.some(
          (folderAndNoteName) =>
            projectSettings.pinnedNotes.has(folderAndNoteName)
        );

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
                    {' '}
                    Reveal In Finder
                  </span>
                </span>
              ),
              value: 'reveal-in-finder',
              onChange: () =>
                revealInFinder({
                  selectionRange: newSelectionRange,
                  folder: sidebarNoteFolder,
                }),
            },
            ...(isShowingPinOption
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        <PinTack2
                          width={17}
                          height={17}
                          className="will-change-transform"
                        />{' '}
                        <span className="will-change-transform">Pin Notes</span>
                      </span>
                    ),
                    value: 'pin-note',
                    onChange: () => {
                      pinOrUnpinNote({
                        folder: sidebarNoteFolder,
                        selectionRange: newSelectionRange,
                        shouldPin: true,
                      });
                    },
                  },
                ]
              : []),
            ...(isShowingUnpinOption
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        <PinTackSlash
                          width={17}
                          height={17}
                          className="will-change-transform"
                        />{' '}
                        <span className="will-change-transform">
                          {' '}
                          Unpin Notes
                        </span>
                      </span>
                    ),
                    value: 'unpin-note',
                    onChange: () => {
                      pinOrUnpinNote({
                        folder: sidebarNoteFolder,
                        selectionRange: newSelectionRange,
                        shouldPin: false,
                      });
                    },
                  },
                ]
              : []),
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <TagPlus
                    width={17}
                    height={17}
                    className="will-change-transform"
                  />{' '}
                  <span className="will-change-transform"> Edit Tags</span>
                </span>
              ),
              value: 'edit-tags',
              onChange: () => {
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: 'Edit Tags',
                  dialogClassName: 'w-[min(30rem,90vw)]',
                  children: (errorText) => (
                    <EditTagDialogChildren
                      selectionRange={newSelectionRange}
                      folder={sidebarNoteFolder}
                      errorText={errorText}
                    />
                  ),
                  onSubmit: async (e, setErrorText) => {
                    return await editTags({
                      e,
                      setErrorText,
                      selectionRange: newSelectionRange,
                      folder: sidebarNoteFolder,
                      isInTagsSidebar,
                    });
                  },
                });
              },
            },
            ...(newSelectionRange.size === 1
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        <FilePen
                          width={17}
                          height={17}
                          className="will-change-transform"
                        />{' '}
                        <span className="will-change-transform"> Rename</span>
                      </span>
                    ),
                    value: 'rename-file',
                    onChange: () => {
                      setDialogData({
                        isOpen: true,
                        isPending: false,
                        title: 'Rename File',
                        dialogClassName: 'w-[min(25rem,90vw)]',
                        children: (errorText) => {
                          const selectedNote = [...newSelectionRange][0];

                          return (
                            <RenameFileDialogChildren
                              selectedNote={selectedNote}
                              errorText={errorText}
                              isInTagsSidebar={isInTagsSidebar}
                            />
                          );
                        },
                        onSubmit: async (e, setErrorText) => {
                          try {
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            const newFileName = formData.get(
                              'new-file-name'
                            ) as string;
                            if (!newFileName) {
                              setErrorText('Please enter a new file name');
                              return false;
                            }

                            // Use the FilePath object for cleaner path handling
                            const originalPath = isInTagsSidebar
                              ? `${sidebarNoteFolder}/${sidebarNotePath.note}`
                              : `${sidebarNoteFolder}/${sidebarNotePath.note}`;

                            const targetFolder = sidebarNoteFolder;
                            const newPath = `${targetFolder}/${newFileName}.${sidebarNoteExtension}`;
                            await renameFile({
                              oldPath: originalPath,
                              newPath: newPath,
                            });

                            const newFilePath = new FilePath({
                              folder: targetFolder,
                              note: `${newFileName}.${sidebarNoteExtension}`,
                            });
                            if (isInTagsSidebar) {
                              navigate(
                                `/tags/${encodeURIComponent(tagState.tagName)}${newFilePath.getLinkToNote()}`
                              );
                            } else {
                              navigate(newFilePath.getLinkToNote());
                            }
                            return true;
                          } catch (error) {
                            setErrorText(
                              error instanceof Error
                                ? error.message
                                : 'Failed to rename file'
                            );
                            return false;
                          }
                        },
                      });
                    },
                  },
                ]
              : []),
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <Trash
                    width={17}
                    height={17}
                    className="will-change-transform"
                  />{' '}
                  <span className="will-change-transform"> Move to Trash</span>
                </span>
              ),
              value: 'move-to-trash',
              onChange: () =>
                moveToTrash({
                  selectionRange: newSelectionRange,
                  folder: sidebarNoteFolder,
                }),
            },
          ],
        });
      }}
      className={cn(
        projectSettings.appearance.noteSidebarItemSize === 'list' &&
          'list-sidebar-item',
        projectSettings.appearance.noteSidebarItemSize === 'card' &&
          'card-sidebar-item',
        projectSettings.appearance.noteSidebarItemSize === 'card' &&
          sidebarNoteIndex === 0 &&
          'border-t',
        isActive && 'bg-zinc-150 dark:bg-zinc-700',
        isSelected && 'bg-(--accent-color)! text-white'
      )}
      onClick={(e) => {
        if (e.metaKey || e.shiftKey) return;
        const buttonElem = e.target as HTMLButtonElement;
        buttonElem.focus();
        navigate(
          isInTagsSidebar
            ? `/tags/${tagState.tagName}${sidebarNotePath.getLinkToNote()}`
            : sidebarNotePath.getLinkToNote()
        );
      }}
    >
      {projectSettings.appearance.noteSidebarItemSize === 'list' && (
        <ListNoteSidebarItem
          sidebarNoteName={sidebarNoteName}
          sidebarNoteExtension={sidebarNoteExtension}
          activeNoteNameWithExtension={activeNoteNameWithExtension}
          sidebarNoteNameWithoutExtension={sidebarNoteNameWithoutExtension}
        />
      )}
      {projectSettings.appearance.noteSidebarItemSize === 'card' && (
        <CardNoteSidebarItem
          imgSrc={imgSrc}
          sidebarNoteExtension={sidebarNoteExtension}
          sidebarNoteNameWithoutExtension={sidebarNoteNameWithoutExtension}
          notePreviewResult={notePreviewResult ?? null}
          isSelected={isSelected}
        />
      )}
    </button>
  );
}
