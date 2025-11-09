import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
} from 'lexical';

export function isDecoratorNodeSelected(nodeKey: string) {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) return false;
  return selection.has(nodeKey);
}

export function onClickDecoratorNodeCommand(
  e: MouseEvent,
  node: HTMLElement | null,
  setSelected: (arg0: boolean) => void,
  clearSelection: () => void
): boolean {
  if (e.target === node || node?.contains(e.target as Node)) {
    if (!e.shiftKey) clearSelection();
    setSelected(true);
    return true;
  }
  e.stopPropagation();
  e.preventDefault();

  return false;
}

/**
 * When enter is pressed on a selected decorator node,
 * a new paragraph node is inserted after it
 */
export function enterKeyDecoratorNodeCommand(
  e: KeyboardEvent,
  nodeKey: string
) {
  if (isDecoratorNodeSelected(nodeKey)) {
    const node = $getNodeByKey(nodeKey);
    if (node) {
      // Prevents the double enter
      e.preventDefault();
      node.insertAfter($createParagraphNode());
      node.selectNext();
      return true;
    }
  }
  return false;
}

export function removeDecoratorNode(nodeKey: string) {
  const node = $getNodeByKey(nodeKey);
  if (node) {
    node.remove();
    return true;
  }
  return false;
}
