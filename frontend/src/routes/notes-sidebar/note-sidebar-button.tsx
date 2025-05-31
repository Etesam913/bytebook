import { useAtomValue, useSetAtom } from 'jotai/react';
import { type Dispatch, type SetStateAction } from 'react';
import {
  contextMenuDataAtom,
  dialogDataAtom,
  draggedElementAtom,
  projectSettingsAtom,
} from '../../atoms';
import { handleDragStart } from '../../components/sidebar/utils';
import {
  useAddTagsMutation,
  useMoveNoteToTrashMutation,
  useNotePreviewQuery,
  useNoteRevealInFinderMutation,
  usePinNotesMutation,
} from '../../hooks/notes';
import { Finder } from '../../icons/finder';
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
  keepSelectionNotesWithPrefix,
} from '../../utils/selection';
import { cn, extractInfoFromNoteName } from '../../utils/string-formatting';
import { CardNoteSidebarItem } from './card-note-sidebar-item';
import { ListNoteSidebarItem } from './list-note-sidebar-item';
import { navigate } from 'wouter/use-browser-location';
import { EditTagDialogChildren } from './edit-tag-dialog-children';

export function NoteSidebarButton({
  sidebarNoteFolder,
  activeNoteNameWithoutExtension,
  sidebarNoteName,
  sidebarNoteIndex,
  selectionRange,
  setSelectionRange,
  tagState,
}: {
  activeNoteNameWithoutExtension: string | undefined;
  sidebarNoteFolder: string;
  sidebarNoteName: string;
  sidebarNoteIndex: number;
  selectionRange: Set<string>;
  setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  tagState?: {
    tagName: string;
  };
}) {
  const {
    noteNameWithoutExtension: sidebarNoteNameWithoutExtension,
    queryParams,
  } = extractInfoFromNoteName(sidebarNoteName);
  const sidebarNoteExtension = queryParams.ext;

  const isInTagsSidebar = tagState?.tagName !== undefined;
  const { mutate: pinOrUnpinNote } = usePinNotesMutation(isInTagsSidebar);
  const { mutate: revealInFinder } =
    useNoteRevealInFinderMutation(isInTagsSidebar);
  const { mutate: moveToTrash } = useMoveNoteToTrashMutation(isInTagsSidebar);
  const { mutateAsync: addTagsToNotes } = useAddTagsMutation();

  const setDialogData = useSetAtom(dialogDataAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setDraggedElement = useSetAtom(draggedElementAtom);
  const searchParams: { ext?: string } = useSearchParamsEntries();

  const activeNoteNameWithExtension = `${activeNoteNameWithoutExtension}?ext=${searchParams.ext}`;

  const { data: notePreviewResult } = useNotePreviewQuery(
    decodeURIComponent(sidebarNoteFolder),
    decodeURIComponent(sidebarNoteNameWithoutExtension),
    sidebarNoteExtension
  );

  const notePreviewResultData = notePreviewResult?.data;
  const firstImageSrc = notePreviewResultData?.firstImageSrc ?? '';
  const isImageFile = IMAGE_FILE_EXTENSIONS.includes(sidebarNoteExtension);
  const imgSrc =
    !notePreviewResultData || firstImageSrc === ''
      ? isImageFile
        ? `${FILE_SERVER_URL}/notes/${sidebarNoteFolder}/${sidebarNoteNameWithoutExtension}.${sidebarNoteExtension}`
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
        let newSelectionRange = new Set([`note:${noteNameForSelection}`]);
        if (selectionRange.size === 0) {
          setSelectionRange(newSelectionRange);
        } else {
          setSelectionRange((prev) => {
            const setWithoutNotes = keepSelectionNotesWithPrefix(prev, 'note');
            setWithoutNotes.add(`note:${noteNameForSelection}`);
            newSelectionRange = setWithoutNotes;
            return setWithoutNotes;
          });
        }
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
          x: e.clientX,
          y: e.clientY,
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
                  Reveal In Finder
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
                        Pin Notes
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
                        Unpin Notes
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
                  Edit Tags
                </span>
              ),
              value: 'edit-tags',
              onChange: () => {
                setDialogData({
                  isOpen: true,
                  isPending: false,
                  title: 'Edit Tags',
                  dialogClassName: '',
                  children: () => (
                    // <AddTagDialogChildren onSubmitErrorText={errorText} />
                    <EditTagDialogChildren />
                  ),
                  onSubmit: async (e, setErrorText) => {
                    // const formElement = e.target as HTMLFormElement;
                    // const formCheckboxElements = formElement.querySelectorAll(
                    // 	"input[type='checkbox']",
                    // ) as NodeListOf<HTMLInputElement>;
                    // const tagsToAdd = Array.from(formCheckboxElements)
                    // 	.filter(
                    // 		(checkbox) =>
                    // 			checkbox.value === "on" && !checkbox.indeterminate,
                    // 	)
                    // 	.map((checkbox) => checkbox.name);
                    // const tagsToRemove = Array.from(
                    // 	formCheckboxElements,
                    // ).filter((checkbox) => !checkbox.value);
                    // const addPathsResponse = addPathsToTags({
                    // 	e,
                    // 	setErrorText,
                    // 	folder: curFolder,
                    // 	selectionRange: newSelectionRange,
                    // });
                    // return true;
                    return addTagsToNotes({
                      e,
                      setErrorText,
                      folder: sidebarNoteFolder,
                      selectionRange: newSelectionRange,
                    });
                  },
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
                  Move to Trash
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
            ? `/tags/${tagState.tagName}/${sidebarNoteFolder}/${sidebarNoteName}`
            : `/${sidebarNoteFolder}/${sidebarNoteName}`
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
