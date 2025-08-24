import {
  $createNodeSelection,
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
import { FILE_SERVER_URL, debounce } from '../../../utils/general';
import {
  convertFilePathToQueryNotation,
  encodeNoteNameWithQueryParams,
  getFileExtension,
} from '../../../utils/string-formatting';
import type { FilePayload } from '../nodes/file';
import { $createLinkNode } from '../nodes/link';
import { INSERT_FILES_COMMAND } from '../plugins/file';
import { SAVE_MARKDOWN_CONTENT } from '../plugins/save';

export const debouncedNoteHandleChange = debounce(noteHandleChange, 275);

/**
 * Handles changes to the note editor.
 *
 * @param editor - The LexicalEditor instance that is being updated.
 * @param tags - A set of tags indicating the context of the change, such as
 * "note:changed-from-other-window" or "note:initial-load"
 */
async function noteHandleChange(editor: LexicalEditor, tags: Set<string>) {
  /*
    If the note was changed from another window, don't update it again
    If a new note is loaded for the first time, we don't need this func to run
  */
  if (
    tags.has('note:changed-from-other-window') ||
    tags.has('note:initial-load')
  ) {
    return;
  }
  editor.update(
    () => {
      editor.dispatchCommand(SAVE_MARKDOWN_CONTENT, undefined);
    },
    { tag: 'note:changed-from-other-window' }
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
  const isInteractable = element.getAttribute('data-interactable');
  if (isInteractable) {
    const nodeKey = element.getAttribute('data-node-key');
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
  }
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
 *
 * This function occurs when you drag text or a link from one note to another
 */
export function overrideControlledTextInsertion(
  e: string | InputEvent,
  editor: LexicalEditor,
  draggedElement: HTMLElement | null
) {
  // @ts-expect-error Data Transfer does exist when dragging a link
  if (!e.dataTransfer || !draggedElement) return false;
  // @ts-expect-error Data Transfer does exist when dragging a link
  const fileText: string = e.dataTransfer.getData('text/plain');

  const files = fileText.split(',');
  const linkPayloads: { url: string; title: string }[] = [];
  const filesPayload: FilePayload[] = [];

  for (const fileText of files) {
    if (fileText.startsWith('wails:')) {
      const segments = fileText.split('/');
      // You are dealing with a folder link
      if (fileText.indexOf('.') === -1) {
        linkPayloads.push({
          url: fileText,
          title: segments.pop() ?? '',
        });
      }
      // You are dealing with a note link or a file link
      else {
        const { urlWithoutExtension, extension, fileName } = getFileExtension(
          encodeNoteNameWithQueryParams(fileText)
        );
        // Create a link to the markdown note
        if (!urlWithoutExtension || !extension || !fileName) return true;
        const segments = decodeURIComponent(urlWithoutExtension).split('/');
        const title = segments.pop() ?? '';
        const folder = segments.pop() ?? '';
        // All payload contents are decoded, the components will do the encoding
        if (extension === 'md') {
          linkPayloads.push({
            url: convertFilePathToQueryNotation(
              `${decodeURIComponent(urlWithoutExtension)}.${extension}`
            ),
            title: title,
          });
        } else {
          filesPayload.push({
            alt: title,
            src: `${FILE_SERVER_URL}/notes/${folder}/${title}.${extension}`,
          });
        }
      }
    }
  }

  // Creating links
  for (const linkPayload of linkPayloads) {
    const linkNode = $createLinkNode(linkPayload.url, {
      title: linkPayload.title,
    });
    const linkTextNode = $createTextNode(linkPayload.title);
    linkNode.append(linkTextNode);
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selection.insertNodes([linkNode]);
    }
  }
  if (filesPayload.length > 0) {
    editor.dispatchCommand(INSERT_FILES_COMMAND, filesPayload);
  }

  return true;
}
