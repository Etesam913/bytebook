import { $dfs } from '@lexical/utils';
import { $getRoot, $isTextNode, LexicalEditor } from 'lexical';
import { MatchData, clearHighlight, highlightMatch } from './highlight';
import { type RefObject } from 'react';

/**
 * Performs a case-insensitive search for the given term in the editor content.
 * @param editor - The Lexical editor instance
 * @param searchTerm - The text to search for in the editor
 * @returns Array of match data for all found matches
 */
export function performSearch(
  editor: LexicalEditor,
  searchTerm: string
): MatchData[] {
  const matches: MatchData[] = [];

  if (!searchTerm.trim()) {
    return matches;
  }
  const normalizedSearchTerm = searchTerm
    .toLowerCase()
    .trim()
    .replaceAll('"', '”');

  editor.read(() => {
    const nodes = $dfs($getRoot());
    // Storing the matches for searchTerm in each text node
    nodes.forEach(({ node }) => {
      if (!$isTextNode(node)) return;

      const nodeText = node.getTextContent().toLowerCase();
      let startIndex = 0;

      // Use indexOf in a loop to find all occurrences
      while (
        (startIndex = nodeText.indexOf(normalizedSearchTerm, startIndex)) !== -1
      ) {
        const endIndex = startIndex + normalizedSearchTerm.length - 1;
        matches.push({
          start: startIndex,
          end: endIndex,
          nodeKey: node.getKey(),
          format: node.getFormat(),
        });

        // Move the starting point for the next search
        startIndex++;
      }
    });
  });

  return matches;
}

/**
 * Moves the highlight to the adjacent match, wrapping around at either end.
 */
export function navigateToMatch({
  editor,
  matchData,
  currentMatchIndex,
  setCurrentMatchIndex,
  highlightedNodeKeyRef,
  direction,
}: {
  editor: LexicalEditor;
  matchData: MatchData[];
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  highlightedNodeKeyRef: RefObject<string | null>;
  direction: 'next' | 'previous';
}): void {
  const total = matchData.length;
  if (total === 0) return;

  const nextIndex =
    direction === 'next'
      ? (currentMatchIndex + 1) % total
      : currentMatchIndex <= 0
        ? total - 1
        : currentMatchIndex - 1;

  clearHighlight(editor, highlightedNodeKeyRef);
  setCurrentMatchIndex(nextIndex);
  highlightedNodeKeyRef.current = highlightMatch(editor, matchData[nextIndex]);
}
