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
  extractInfoFromNoteName,
  convertNoteNameToDotNotation,
} from '../../utils/string-formatting';

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
 * Handles the drag start event for dragging files of various types.
 * Sets up the drag data and visual feedback for the drag operation.
 */
export function handleDragStart({
  e,
  setSelectionRange,
  contentType,
  draggedItem,
  setDraggedElement,
  folder,
  isInTagsSidebar,
}: {
  e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>;
  setSelectionRange: Dispatch<SetStateAction<Set<string>>>;
  contentType: 'folder' | 'note';
  draggedItem: string;
  setDraggedElement: Dispatch<SetStateAction<HTMLElement | null>>;
  folder?: string;
  isInTagsSidebar?: boolean;
}) {
  setSelectionRange((tempSet) => {
    const tempSelectionRange = new Set(tempSet);
    tempSelectionRange.add(`${contentType}:${draggedItem}`);

    const selectedFiles = getSelectedFiles(
      tempSelectionRange,
      contentType,
      folder
    );

    setDataTransfer({
      e,
      selectedFiles,
      tempSelectionRange,
      contentType,
      folder,
      isInTagsSidebar: isInTagsSidebar ?? false,
    });

    const dragElement = e.target as HTMLElement;
    const ghostElement = createGhostElementFromHtmlElement(dragElement);
    setDraggedElement(ghostElement);

    const children = createDragPreviewChildren(selectedFiles, contentType);
    renderGhostElement(ghostElement, children, e);

    // Clean up the ghost element after the drag ends
    function handleDragEnd() {
      // Update the selected range so that only 1 item is highlighted
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
 * Retrieves the selected files based on the current selection range.
 * Constructs file paths for the selected items.
 */
function getSelectedFiles(
  tempSelectionRange: Set<string>,
  contentType: string,
  folder?: string
) {
  return Array.from(tempSelectionRange).map((noteNameWithExtensionParam) => {
    const noteNameWithoutPrefixWithExtension =
      noteNameWithExtensionParam.split(':')[1];
    if (contentType === 'folder') {
      const { noteNameWithoutExtension } = extractInfoFromNoteName(
        noteNameWithoutPrefixWithExtension
      );
      return `wails://localhost:5173/${noteNameWithoutExtension}`;
    }
    if (!folder) {
      return '';
    }
    return `wails://localhost:5173/${folder}/${convertNoteNameToDotNotation(noteNameWithoutPrefixWithExtension)}`;
  });
}

/**
 * Sets the data transfer object for the drag event.
 * Prepares the data to be transferred during the drag operation.
 */
function setDataTransfer({
  e,
  selectedFiles,
  tempSelectionRange,
  contentType,
  folder,
  isInTagsSidebar,
}: {
  e: DragEvent<HTMLAnchorElement> | DragEvent<HTMLButtonElement>;
  selectedFiles: string[];
  tempSelectionRange: Set<string>;
  contentType: string;
  folder?: string;
  isInTagsSidebar: boolean;
}) {
  e.dataTransfer.setData('text/plain', selectedFiles.join(','));

  const bytebookFilesData = Array.from(tempSelectionRange).map(
    (noteNameWithExtensionParam) => {
      const noteNameWithoutPrefixWithExtension =
        noteNameWithExtensionParam.split(':')[1];
      const { noteNameWithoutExtension, queryParams } = extractInfoFromNoteName(
        noteNameWithoutPrefixWithExtension
      );
      let curItemFolder: string | null = null;
      let curItemNote: string | null = null;
      if (contentType === 'folder') {
        curItemFolder = noteNameWithoutPrefixWithExtension;
      } else if (contentType === 'note') {
        curItemFolder = folder ?? null;
        curItemNote = noteNameWithoutExtension;
      }
      return {
        folder: curItemFolder,
        note: curItemNote,
        extension: queryParams.ext,
      };
    }
  );

  // Dragging files from the tags note sidebar is a complex beast, so don't support it for now.
  if (isInTagsSidebar) {
    return;
  }
  if (contentType === 'note') {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(
      BYTEBOOK_DRAG_DATA_FORMAT,
      JSON.stringify({ fileData: bytebookFilesData })
    );
  }
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
