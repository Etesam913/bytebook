import { $getNodeByKey, $getSelection, $isNodeSelection } from 'lexical';

// Returns true if the Lexical decorator node with the given key is currently selected.
export function isDecoratorNodeSelected(nodeKey: string) {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) return false;
  return selection.has(nodeKey);
}

// Removes the Lexical decorator node with the given key from the editor and returns true on success.
export function removeDecoratorNode(nodeKey: string) {
  const node = $getNodeByKey(nodeKey);
  if (node) {
    node.remove();
    return true;
  }
  return false;
}
