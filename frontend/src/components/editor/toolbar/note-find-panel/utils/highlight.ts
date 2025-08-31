import {
  $addUpdateTag,
  $getNodeByKey,
  $isElementNode,
  $isTextNode,
  IS_HIGHLIGHT,
  LexicalEditor,
  LexicalNode,
  TextNode,
} from 'lexical';

export type MatchData = {
  start: number;
  end: number;
  nodeKey: string;
  format: number;
};

/**
 * Clears the currently highlighted search match and restores its original formatting.
 * Also merges adjacent text nodes that were split during highlighting.
 * @param editor - The Lexical editor instance
 * @param highlightedNodeKey - The key of the currently highlighted node
 * @returns void
 */
export function clearHighlight(
  editor: LexicalEditor,
  highlightedNodeKeyRef: React.MutableRefObject<string | null>
): void {
  if (!highlightedNodeKeyRef.current) return;

  editor.update(
    () => {
      // Prevents the editor from being selected and stealing focus from the find input
      $addUpdateTag('skip-dom-selection');

      const node = $getNodeByKey(highlightedNodeKeyRef.current!);
      if (node && $isTextNode(node) && node.hasFormat('highlight')) {
        const parent = node.getParent();
        if (parent && $isElementNode(parent)) {
          const indexOfHighlightedNode = parent.getChildren().indexOf(node);

          // Restore the original format instead of just toggling highlight
          node.toggleFormat('highlight');

          // Merge with adjacent text nodes since we split them during highlighting
          // Merge can only happen if the two nodes have the same format
          const canMergeWith = (
            sibling: LexicalNode | null,
            targetNode: TextNode
          ): sibling is TextNode => {
            // Only merge if both are text nodes and have the same format
            return !!(
              sibling &&
              $isTextNode(sibling) &&
              sibling.getFormat() === targetNode.getFormat()
            );
          };

          const prevSibling = parent.getChildAtIndex(
            indexOfHighlightedNode - 1
          );

          if (canMergeWith(prevSibling, node)) {
            // Merge with previous sibling while preserving format
            const mergedText =
              prevSibling.getTextContent() + node.getTextContent();
            prevSibling.setTextContent(mergedText);
            node.remove();

            // Check if we can also merge with next sibling
            const nextSibling = parent.getChildAtIndex(indexOfHighlightedNode);
            if (canMergeWith(nextSibling, prevSibling)) {
              const finalText =
                prevSibling.getTextContent() + nextSibling.getTextContent();
              prevSibling.setTextContent(finalText);
              nextSibling.remove();
            }
          } else {
            // Check if we can merge with next sibling only
            const nextSibling = parent.getChildAtIndex(
              indexOfHighlightedNode + 1
            );
            if (canMergeWith(nextSibling, node)) {
              const mergedText =
                node.getTextContent() + nextSibling.getTextContent();
              const preservedFormat = node.getFormat();
              node.setTextContent(mergedText);
              node.setFormat(preservedFormat);
              nextSibling.remove();
            }
          }
        }
      }
    },
    // The tag makes sure that the clearing of the highlight is not included in the history
    { tag: 'history-merge' }
  );
  highlightedNodeKeyRef.current = null;
}

/**
 * Highlights a specific search match by splitting the text node and applying highlight formatting.
 * @param editor - The Lexical editor instance
 * @param match - The match data to highlight
 * @returns The key of the highlighted node or null if highlighting failed
 */
export function highlightMatch(
  editor: LexicalEditor,
  match: MatchData
): string | null {
  let targetNodeKey: string | null = null;

  editor.update(() => {
    // Prevents the editor from being selected and stealing focus from the find input
    $addUpdateTag('skip-dom-selection');

    const node = $getNodeByKey(match.nodeKey);
    if (!node || !$isTextNode(node)) return;

    // Splits text node by match into text before match, match text, and text after match
    const newNodes =
      match.start === 0
        ? node.splitText(match.end + 1)
        : node.splitText(match.start, match.end + 1);

    const targetNode = match.start === 0 ? newNodes[0] : newNodes[1];

    // Add highlight format to the target node
    const currentFormatWithHighlight = targetNode.getFormat() | IS_HIGHLIGHT;

    targetNode.setFormat(currentFormatWithHighlight);
    targetNodeKey = targetNode.getKey();
  });

  if (targetNodeKey) {
    // Get the node again to scroll to it
    editor.read(() => {
      const targetNode = $getNodeByKey(targetNodeKey!);
      if (targetNode && $isTextNode(targetNode)) {
        if (targetNode) {
          const editorElement = editor.getElementByKey(targetNode.getKey());
          if (editorElement) {
            editorElement.scrollIntoView({
              block: 'center',
              inline: 'nearest',
            });
          }
        }
      }
    });
  }

  return targetNodeKey;
}
