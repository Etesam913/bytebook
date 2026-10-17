import { $dfs } from '@lexical/utils';
import {
  $addUpdateTag,
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $isTextNode,
  IS_HIGHLIGHT,
  LexicalEditor,
} from 'lexical';

export type MatchData = {
  start: number;
  // Inclusive offset in endNodeKey, which may differ from nodeKey.
  end: number;
  nodeKey: string;
  endNodeKey: string;
  format: number;
};

/**
 * Clears all highlights in the editor by removing the highlight format from all text nodes.
 * @param editor - The Lexical editor instance
 */
function clearAllHighlights(editor: LexicalEditor): void {
  editor.update(
    () => {
      // Prevents the editor from being selected and stealing focus from the find input
      $addUpdateTag('skip-dom-selection');

      const nodes = $dfs($getRoot());
      nodes.forEach(({ node }) => {
        if ($isTextNode(node) && node.hasFormat('highlight')) {
          // Remove only highlight, preserving bold, italic, and other formats.
          node.toggleFormat('highlight');
        }
      });
    },
    // The tag makes sure that the clearing of the highlight is not included in the history
    { tag: 'history-merge' }
  );
}

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
  // A match can span several nodes. Lexical normalizes the adjacent text
  // pieces after their highlight formats are removed.
  clearAllHighlights(editor);

  highlightedNodeKeyRef.current = null;
}

/**
 * Highlights a search match across text nodes, splitting only its boundaries.
 * @param editor - The Lexical editor instance
 * @param match - The match data to highlight
 * @returns The key of the first highlighted node or null if highlighting failed
 */
export function highlightMatch(
  editor: LexicalEditor,
  match: MatchData
): string | null {
  let targetNodeKey: string | null = null;

  editor.update(() => {
    // Prevents the editor from being selected and stealing focus from the find input
    $addUpdateTag('skip-dom-selection');

    const startNode = $getNodeByKey(match.nodeKey);
    const endNode = $getNodeByKey(match.endNodeKey);
    if (!$isTextNode(startNode) || !$isTextNode(endNode)) return;

    const selection = $createRangeSelection();
    selection.setTextNodeRange(startNode, match.start, endNode, match.end + 1);
    for (const node of selection.extract()) {
      if (!$isTextNode(node)) continue;
      // Keep each node's formatting when a match crosses bold/italic boundaries.
      node.setFormat(node.getFormat() | IS_HIGHLIGHT);
      targetNodeKey ??= node.getKey();
    }
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
