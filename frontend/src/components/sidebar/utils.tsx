import type { Dispatch, DragEvent, JSX, SetStateAction } from 'react';
import { createRoot } from 'react-dom/client';
import { Folder } from '../../icons/folder';
import { ImageIcon } from '../../icons/image';
import { Note } from '../../icons/page';
import {
  BYTEBOOK_DRAG_DATA_FORMAT,
  createGhostElementFromHtmlElement,
} from '../../utils/draggable';
import {
  FilePath,
  getContentTypeAndValueFromSelectionRangeValue,
} from '../../utils/string-formatting';
import { WAILS_URL } from '../../utils/general';

/** Gets the file icon for the dragged item */
function getFileIcon(fileType: 'folder' | 'note' | 'image') {
  switch (fileType) {
    case 'folder':
      return <Folder className="min-w-5" height={20} width={20} title="" />;
    case 'note':
      return <Note className="min-w-5 w-5" title="" />;
    case 'image':
      return <ImageIcon className="min-w-5 w-5" title="" />;
  }
}
const MAX_VISIBLE_DRAG_PREVIEW_NOTES = 10;

/**
 * Handles the drag start event for dragging folders.
 * Sets up the drag data and visual feedback for the drag operation.
 */
export function handleFolderDragStart({
  e,
  setSelectionRange,
  draggedFolder,
  setDraggedElement,
}: {
  e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>;
  setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  draggedFolder: string;
  setDraggedElement: Dispatch<SetStateAction<HTMLElement | null>>;
}) {
  setSelectionRange((tempSet) => {
    const tempSelectionRange = new Set(tempSet);
    tempSelectionRange.add(`folder:${draggedFolder}`);

    const selectedFolders = [...tempSelectionRange].map(
      (selectionRangeEntry) => {
        const { value: folderFromSelectionRange } =
          getContentTypeAndValueFromSelectionRangeValue(selectionRangeEntry);
        return folderFromSelectionRange;
      }
    );

    const selectedFiles = selectedFolders.map(
      (folder) => `${WAILS_URL}/${folder}`
    );

    setFolderDataTransfer({ e, selectedFolders });

    const dragElement = e.target as HTMLElement;
    const ghostElement = createGhostElementFromHtmlElement({
      element: dragElement,
    });
    setDraggedElement(ghostElement);

    const children = createDragPreviewChildren(selectedFiles, 'folder');
    renderGhostElement(ghostElement, children, e);

    // Clean up the ghost element after the drag ends
    function handleDragEnd() {
      setSelectionRange(new Set());
      ghostElement.remove();
      setDraggedElement(null);
      dragElement.removeEventListener('dragEnd', handleDragEnd);
    }
    dragElement.addEventListener('dragend', handleDragEnd);

    return tempSelectionRange;
  });
}

/**
 * Handles the drag start event for dragging notes.
 * Sets up the drag data and visual feedback for the drag operation.
 */
export function handleNoteDragStart({
  e,
  setSelectionRange,
  draggedNote,
  setDraggedElement,
  folder,
}: {
  e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>;
  setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  draggedNote: string;
  setDraggedElement: Dispatch<SetStateAction<HTMLElement | null>>;
  folder: string;
}) {
  setSelectionRange((tempSet) => {
    const tempSelectionRange = new Set(tempSet);
    tempSelectionRange.add(`note:${draggedNote}`);

    const selectedNotes = [...tempSelectionRange].map((selectionRangeEntry) => {
      const { value: noteFromSelectionRange } =
        getContentTypeAndValueFromSelectionRangeValue(selectionRangeEntry);
      return noteFromSelectionRange;
    });

    const selectedFilePaths = selectedNotes.map((note) => {
      return new FilePath({
        folder,
        note,
      });
    });

    const selectedFiles = selectedFilePaths.map((filePath) =>
      filePath.toString()
    );

    setNoteDataTransfer({ e, selectedFilePaths });

    const dragElement = e.target as HTMLElement;
    const ghostElement = createGhostElementFromHtmlElement({
      element: dragElement,
    });
    setDraggedElement(ghostElement);

    const children = createDragPreviewChildren(
      selectedFiles.map((file) => `${WAILS_URL}/${file}`),
      'note'
    );
    renderGhostElement(ghostElement, children, e);

    // Clean up the ghost element after the drag ends
    function handleDragEnd() {
      setSelectionRange(new Set());
      ghostElement.remove();
      setDraggedElement(null);
      dragElement.removeEventListener('dragEnd', handleDragEnd);
    }
    dragElement.addEventListener('dragend', handleDragEnd);

    return tempSelectionRange;
  });
}

/**
 * Sets the data transfer object for folder drag events.
 */
function setFolderDataTransfer({
  e,
  selectedFolders,
}: {
  e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>;
  selectedFolders: string[];
}) {
  const folderUrls = selectedFolders.map((folder) => `${WAILS_URL}/${folder}`);
  e.dataTransfer.setData('text/plain', folderUrls.join(','));
}

/**
 * Sets the data transfer object for note drag events.
 * Uses FilePath to properly handle note paths and extensions.
 */
function setNoteDataTransfer({
  e,
  selectedFilePaths,
}: {
  e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>;
  selectedFilePaths: FilePath[];
}) {
  const noteUrls = selectedFilePaths.map(
    (filePath) => `${WAILS_URL}/${filePath.toString()}`
  );
  e.dataTransfer.setData('text/plain', noteUrls.join(','));

  const bytebookFilesData = selectedFilePaths.map((filePath) => ({
    folder: filePath.folder,
    note: filePath.noteWithoutExtension,
    extension: filePath.noteExtension,
  }));

  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData(
    BYTEBOOK_DRAG_DATA_FORMAT,
    JSON.stringify({ fileData: bytebookFilesData })
  );
}

/**
 * Creates the visual children elements for the drag preview.
 * Limits the number of visible items in the drag preview.
 */
function createDragPreviewChildren(
  selectedFiles: string[],
  contentType: 'folder' | 'note'
) {
  const children = selectedFiles
    .slice(0, MAX_VISIBLE_DRAG_PREVIEW_NOTES)
    .map((file) => {
      return (
        <>
          {getFileIcon(contentType)}
          <p
            key={file}
            className="overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {file.split('/').at(-1)}
          </p>
        </>
      );
    });

  if (selectedFiles.length > MAX_VISIBLE_DRAG_PREVIEW_NOTES) {
    const remainingFiles =
      selectedFiles.length - MAX_VISIBLE_DRAG_PREVIEW_NOTES;
    children.push(
      <p key="more-files" className="text-sm">
        +{remainingFiles} more {remainingFiles > 1 ? 'files' : 'file'}
      </p>
    );
  }

  return children;
}

/**
 * Renders the ghost element for the drag operation.
 * Attaches the visual representation of the drag to the cursor.
 */
function renderGhostElement(
  ghostElement: HTMLElement,
  children: JSX.Element[],
  e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>
) {
  document.body.appendChild(ghostElement);
  const ghostRoot = createRoot(ghostElement);
  ghostRoot.render(children);
  e.dataTransfer.setDragImage(ghostElement, -25, -25);
}
