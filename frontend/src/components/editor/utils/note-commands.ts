import {
  $createNodeSelection,
  $createRangeSelectionFromDom,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $setSelection,
  type LexicalEditor,
  type LexicalNode,
  type NodeSelection,
} from 'lexical';
import { isDecoratorNodeSelected } from '../../../utils/commands';
import { debounce } from '../../../utils/general';
import {
  createFilePath,
  createFolderPath,
  safeDecodeURIComponent,
  type FilePath,
} from '../../../utils/path';
import { WAILS_URL } from '../../../utils/general';
import type { FilePayload } from '../nodes/file';
import { $createLinkNode } from '../nodes/link';
import { INSERT_FILES_COMMAND } from '../plugins/file';
import { SAVE_MARKDOWN_CONTENT } from '../plugins/save';
import { caretPositionFromPointInEditor } from './drag';

export const debouncedNoteHandleChange = debounce(noteHandleChange, 150);

/**
 * Sets a collapsed Lexical range selection at the DOM caret under the pointer.
 * Call only inside `editor.update()`. Returns false if the point is outside
 * the note contenteditable or mapping fails.
 */
export function setSelectionFromPointerInNoteEditor(
  editor: LexicalEditor,
  clientX: number,
  clientY: number
): boolean {
  const caret = caretPositionFromPointInEditor(clientX, clientY);
  if (!caret) return false;

  const domSel = window.getSelection();
  if (!domSel) return false;

  const range = document.createRange();
  range.setStart(caret.node, caret.offset);
  range.setEnd(caret.node, caret.offset);
  domSel.removeAllRanges();
  domSel.addRange(range);

  const lexicalSel = $createRangeSelectionFromDom(domSel, editor);
  if (!lexicalSel || !$isRangeSelection(lexicalSel)) return false;
  $setSelection(lexicalSel);
  return true;
}

/**
 * Handles changes to the note editor.
 *
 * @param editor - The LexicalEditor instance that is being updated.
 * @param tags - A set of tags indicating the context of the change, such as
 * "note:write-from-external" or "note:initial-load"
 */
function noteHandleChange(editor: LexicalEditor, tags: Set<string>) {
  /*
    If the note was changed from another window, don't update it again
    If a new note is loaded for the first time, we don't need this func to run
  */
  if (tags.has('note:write-from-external') || tags.has('note:initial-load')) {
    return;
  }
  editor.update(
    () => {
      editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, undefined);
    },
    { tag: 'note:write-from-external' }
  );
}
/**
 * Makes it so that the code-block undo/redo stack is not affected by the undo/redo stack of the editor
 */
export function overrideUndoRedoCommand() {
  const selection = $getSelection();
  if ($isNodeSelection(selection)) {
    const element = selection.getNodes().at(0);
    // The code-block has its own undo stack, no need to use lexical's undo stack for this
    if (element?.getType() === 'code-block') {
      return true;
    }
  }
  return false;
}

/**
 * Adds or sets a node selection if the clicked element has the data-interactable attribute
 * and the data-node-key attribute
 */
export function overrideClickCommand(e: MouseEvent) {
  const element = e.target as HTMLElement;
  const interactableTarget = element.closest<HTMLElement>(
    '[data-interactable="true"]'
  );
  if (!interactableTarget) return true;

  const nodeKey = interactableTarget.getAttribute('data-node-key');
  if (!nodeKey) return true;

  let selection = $getSelection();
  const isRegularClick = !e.ctrlKey && !e.shiftKey && !e.metaKey;
  if (isRegularClick || !$isNodeSelection(selection)) {
    selection = $createNodeSelection();
  }

  (selection as NodeSelection).add(nodeKey);
  // Focuses the content-editable as opposed to the div container that surrounds the image. Left and right arrow keys do not work correctly when the div container is selected.
  // document.getElementById("content-editable-editor")?.focus();
  $setSelection(selection);
  return true;
}

/** Goes in direction up the tree until it finds a valid sibling */
function getFirstSiblingNode(
  node: LexicalNode | undefined,
  direction: 'up' | 'down'
) {
  if (!node) return null;
  let siblingNode =
    direction === 'up' ? node.getPreviousSibling() : node.getNextSibling();
  let currentNode = node;
  while (!siblingNode) {
    const parent = currentNode.getParent();
    if (!parent) return null;
    currentNode = parent;
    siblingNode =
      direction === 'up'
        ? currentNode.getPreviousSibling()
        : currentNode.getNextSibling();
  }
  return siblingNode;
}

export function overrideUpDownKeyCommand(
  event: KeyboardEvent,
  command: 'up' | 'down'
) {
  const selection = $getSelection();
  const node = selection?.getNodes().at(-1);
  const isShiftHeldDown = event.shiftKey;
  // You should be able to select multiple nodes when holding shift, so use the default select behavior in this case
  if (!node || isShiftHeldDown) return true;
  if ($isRootNode(node)) {
    const firstChild = node.getFirstChild();
    if (!firstChild) return true;
    return true;
  }
  const nextNode = getFirstSiblingNode(node, command);
  let nextNodeChild: LexicalNode | null = null;
  if (nextNode && $isElementNode(nextNode)) {
    nextNodeChild = nextNode.getChildren().at(0) ?? null;
  }
  const nodeToSelect = nextNodeChild ?? nextNode;
  // going from <p> -> <img>
  if ($isDecoratorNode(nodeToSelect)) {
    const newNodeSelection = $createNodeSelection();
    newNodeSelection.add(nodeToSelect.getKey());
    $setSelection(newNodeSelection);
    // The code-block has its own focus so we have to blur it
    if (node.getType() === 'code-block') {
      document.getElementById('content-editable-editor')?.focus();
    }
    event.preventDefault();
  }
  // going from <img> -> <p>
  else if ($isDecoratorNode(node)) {
    event.preventDefault();
    if (nodeToSelect) {
      // The code-block has its own focus so we have to blur it
      if (node.getType() === 'code-block') {
        document.getElementById('content-editable-editor')?.focus();
      }
      nodeToSelect.selectEnd();
    }
  }

  return true;
}

/** Overrides the default behavior of the escape key to select the next sibling of a selected decorator node*/
export function overrideEscapeKeyCommand(nodeKey: string) {
  if (isDecoratorNodeSelected(nodeKey)) {
    const nodeElem = $getNodeByKey(nodeKey);
    if (nodeElem) {
      const nextElem = nodeElem.getNextSibling();
      if ($isDecoratorNode(nextElem)) {
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(nextElem.getKey());
        $setSelection(nodeSelection);
      } else {
        nodeElem.selectNext(0, 0);
      }
    }
  }
  return false;
}

/**
 * Parses a dragged file URL and extracts its type and metadata
 */
type DraggedFileResult =
  | { type: 'folder'; url: string; title: string }
  | { type: 'markdown'; url: string; title: string }
  | { type: 'file'; filePath: FilePath }
  | { type: 'unknown' };

function parseDraggedFile(fileUrl: string): DraggedFileResult {
  if (!fileUrl.startsWith(WAILS_URL)) {
    return { type: 'unknown' };
  }

  // Trailing slash = folder (set explicitly by the file-tree drag helper);
  // otherwise treat as file. Avoids guessing from a dot, which is wrong for
  // dotted folder names (`v1.0`) and extensionless files (`Makefile`).
  const isFolder = fileUrl.endsWith('/');

  // Strip `wails:` then optional `/notes/` prefix and trailing slash.
  let rawPath = safeDecodeURIComponent(fileUrl.slice(WAILS_URL.length));
  if (rawPath.startsWith('/notes/')) {
    rawPath = rawPath.slice('/notes/'.length);
  }
  if (rawPath.endsWith('/')) {
    rawPath = rawPath.slice(0, -1);
  }

  if (isFolder) {
    const folderPath = createFolderPath(rawPath);
    if (!folderPath) {
      return { type: 'unknown' };
    }
    return {
      type: 'folder',
      url: `${WAILS_URL}${folderPath.encodedFolderUrl}`,
      title: folderPath.folder,
    };
  }

  const filePath = createFilePath(rawPath);
  if (!filePath) {
    return { type: 'unknown' };
  }

  if (filePath.extension === 'md') {
    return {
      type: 'markdown',
      url: `${WAILS_URL}${filePath.encodedFileUrl}`,
      title: filePath.noteWithoutExtension,
    };
  }

  return { type: 'file', filePath };
}

/**
 * Inserts link and file nodes into the editor
 */
function insertNodesIntoEditor(
  editor: LexicalEditor,
  linkPayloads: { url: string; title: string }[],
  filePayloads: FilePayload[]
) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  for (const { url, title } of linkPayloads) {
    const linkNode = $createLinkNode(url, { title });
    const linkTextNode = $createTextNode(title);
    linkNode.append(linkTextNode);
    selection.insertNodes([linkNode]);
  }

  if (filePayloads.length > 0) {
    editor.dispatchCommand(INSERT_FILES_COMMAND, filePayloads);
  }
}

/**
 * This function handles when you drag files or links from one note to another
 */
export function overrideControlledTextInsertion(
  e: string | InputEvent | DragEvent,
  editor: LexicalEditor,
  draggedGhostElement: HTMLElement | null
) {
  const dataTransfer =
    typeof e === 'string'
      ? null
      : ((e as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer ??
        null);
  if (!dataTransfer || !draggedGhostElement) return false;

  const fileText: string = dataTransfer.getData('text/plain');
  const files = fileText.split(',');

  const linkPayloads: { url: string; title: string }[] = [];
  const filePayloads: FilePayload[] = [];

  for (const fileUrl of files) {
    const result = parseDraggedFile(fileUrl);

    switch (result.type) {
      case 'folder':
      case 'markdown':
        linkPayloads.push({ url: result.url, title: result.title });
        break;
      case 'file':
        filePayloads.push({
          alt: result.filePath.noteWithoutExtension,
          src: result.filePath.fileUrl,
        });
        break;
      case 'unknown':
        break;
    }
  }

  insertNodesIntoEditor(editor, linkPayloads, filePayloads);
  return true;
}
