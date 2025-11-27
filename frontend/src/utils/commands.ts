import { $getNodeByKey, $getSelection, $isNodeSelection } from 'lexical';

export function isDecoratorNodeSelected(nodeKey: string) {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) return false;
  return selection.has(nodeKey);
}

export function removeDecoratorNode(nodeKey: string) {
  const node = $getNodeByKey(nodeKey);
  if (node) {
    node.remove();
    return true;
  }
  return false;
}
