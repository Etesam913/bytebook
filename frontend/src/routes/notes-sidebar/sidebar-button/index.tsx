import { useAtom, useAtomValue, useSetAtom } from 'jotai/react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  projectSettingsAtom,
  selectionRangeAtom,
} from '../../../atoms';
import { draggedElementAtom } from '../../../components/editor/atoms';
import { handleNoteDragStart } from '../../../components/sidebar/utils';
import {
  useMoveNoteToTrashMutation,
  useNotePreviewQuery,
  useNoteRevealInFinderMutation,
  usePinNotesMutation,
  useRenameFileMutation,
} from '../../../hooks/notes';
import { Finder } from '../../../icons/finder';
import { FilePen } from '../../../icons/file-pen';
import { PinTack2 } from '../../../icons/pin-tack-2';
import { PinTackSlash } from '../../../icons/pin-tack-slash';
import TagPlus from '../../../icons/tag-plus';
import { Trash } from '../../../icons/trash';
import { IMAGE_FILE_EXTENSIONS } from '../../../types';
import { FILE_SERVER_URL } from '../../../utils/general';
import { useSearchParamsEntries } from '../../../utils/routing';
import {
  getFilePathFromNoteSelectionRange,
  handleKeyNavigation,
  handleContextMenuSelection,
} from '../../../utils/selection';
import { cn, FilePath } from '../../../utils/string-formatting';
import { CardNoteSidebarItem } from './card-note-sidebar-item';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';
import { EditTagDialogChildren } from '../edit-tag-dialog-children';
import { RenameFileDialogChildren } from '../rename-file-dialog-children';
import { currentZoomAtom } from '../../../hooks/resize';
import { useRoute } from 'wouter';
import { useEditTagsFormMutation } from '../../../hooks/tags';
import { routeUrls, type SavedSearchRouteParams } from '../../../utils/routes';

export function NoteSidebarButton({
  sidebarNotePath,
  activeNoteNameWithoutExtension,
  sidebarNoteIndex,
}: {
  sidebarNotePath: FilePath;
  activeNoteNameWithoutExtension: string | undefined;
  sidebarNoteIndex: number;
}) {
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const [isSavedSearchRoute, params] = useRoute<SavedSearchRouteParams>(
    routeUrls.patterns.SAVED_SEARCH
  );

  const { mutate: pinOrUnpinNote } = usePinNotesMutation();
  const { mutate: revealInFinder } = useNoteRevealInFinderMutation();
  const { mutate: moveToTrash } = useMoveNoteToTrashMutation();
  const { mutateAsync: editTags } = useEditTagsFormMutation();
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
  const isImageFile = IMAGE_FILE_EXTENSIONS.includes(
    sidebarNotePath.noteExtension
  );
  const imgSrc =
    !notePreviewResultData || firstImageSrc === ''
      ? isImageFile
        ? `${FILE_SERVER_URL}/notes/${sidebarNotePath.folder}/${sidebarNotePath.note}`
        : ''
      : firstImageSrc;

  const isActive =
    decodeURIComponent(activeNoteNameWithExtension) ===
    sidebarNotePath.noteWithExtensionParam;

  const isSelected =
    selectionRange.has(`note:${sidebarNotePath.note}`) ?? false;

  return (
    <button
      id={isActive ? 'selected-note-button' : undefined}
      type="button"
      title={sidebarNotePath.noteWithExtensionParam}
      draggable
      onKeyDown={(e) => handleKeyNavigation(e)}
      onDragStart={(e) =>
        handleNoteDragStart({
          e,
          setSelectionRange,
          draggedNote: sidebarNotePath.note,
          setDraggedElement,
          folder: sidebarNotePath.folder,
        })
      }
      onContextMenu={(e) => {
        const newSelectionRange = handleContextMenuSelection({
          setSelectionRange,
          itemType: 'note',
          itemName: sidebarNotePath.note,
        });
        const filePaths = getFilePathFromNoteSelectionRange(
          sidebarNotePath.folder,
          newSelectionRange
        );
        const isShowingPinOption = filePaths.some(
          (filePath) => !projectSettings.pinnedNotes.has(filePath.toString())
        );
        const isShowingUnpinOption = filePaths.some((filePath) =>
          projectSettings.pinnedNotes.has(filePath.toString())
        );

        const isShowingEditTagsOption = filePaths.every(
          (filePath) => filePath.noteExtension === 'md'
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
                  folder: sidebarNotePath.folder,
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
                        folder: sidebarNotePath.folder,
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
                        folder: sidebarNotePath.folder,
                        selectionRange: newSelectionRange,
                        shouldPin: false,
                      });
                    },
                  },
                ]
              : []),
            ...(isShowingEditTagsOption
              ? [
                  {
                    label: (
                      <span className="flex items-center gap-1.5">
                        <TagPlus
                          width={17}
                          height={17}
                          className="will-change-transform"
                        />{' '}
                        <span className="will-change-transform">
                          {' '}
                          Edit Tags
                        </span>
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
                            folder={sidebarNotePath.folder}
                            errorText={errorText}
                          />
                        ),
                        onSubmit: async (e, setErrorText) => {
                          return await editTags({
                            e,
                            setErrorText,
                            selectionRange: newSelectionRange,
                            folder: sidebarNotePath.folder,
                          });
                        },
                      });
                    },
                  },
                ]
              : []),
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
                          const noteWithoutPrefix =
                            selectedNote.split(':')[1] || '';
                          const selectedFilePath = new FilePath({
                            folder: sidebarNotePath.folder,
                            note: noteWithoutPrefix,
                          });

                          return (
                            <RenameFileDialogChildren
                              selectedFilePath={selectedFilePath}
                              errorText={errorText}
                            />
                          );
                        },
                        onSubmit: async (e, setErrorText) => {
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
                          const oldFilePath = sidebarNotePath;
                          const newFilePath = new FilePath({
                            folder: sidebarNotePath.folder,
                            note: `${newFileName}.${sidebarNotePath.noteExtension}`,
                          });

                          const result = await renameFile({
                            oldPath: oldFilePath,
                            newPath: newFilePath,
                            setErrorText,
                          });

                          if (result) {
                            navigate(newFilePath.getLinkToNote());
                            return true;
                          }

                          return false;
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
                  folder: sidebarNotePath.folder,
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
        if (isSavedSearchRoute) {
          navigate(
            `/saved-search/${params?.searchQuery}${sidebarNotePath.getLinkToNoteWithoutPrefix()}`
          );
        } else {
          navigate(sidebarNotePath.getLinkToNote());
        }
      }}
    >
      {projectSettings.appearance.noteSidebarItemSize === 'list' && (
        <ListNoteSidebarItem
          sidebarNoteName={sidebarNotePath.noteWithExtensionParam}
          sidebarNoteExtension={sidebarNotePath.noteExtension}
          activeNoteNameWithExtension={activeNoteNameWithExtension}
          sidebarNoteNameWithoutExtension={sidebarNotePath.noteWithoutExtension}
        />
      )}
      {projectSettings.appearance.noteSidebarItemSize === 'card' && (
        <CardNoteSidebarItem
          imgSrc={imgSrc}
          sidebarNoteExtension={sidebarNotePath.noteExtension}
          sidebarNoteNameWithoutExtension={sidebarNotePath.noteWithoutExtension}
          notePreviewResult={notePreviewResult ?? null}
          isSelected={isSelected}
        />
      )}
    </button>
  );
}
