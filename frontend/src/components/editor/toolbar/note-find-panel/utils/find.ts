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
 * Returns the next match index (circular).
 */
function getNextMatchIndex(currentIndex: number, totalMatches: number): number {
  if (totalMatches === 0) return -1;
  return (currentIndex + 1) % totalMatches;
}

/**
 * Returns the previous match index (circular).
 */
function getPreviousMatchIndex(
  currentIndex: number,
  totalMatches: number
): number {
  if (totalMatches === 0) return -1;
  return currentIndex <= 0 ? totalMatches - 1 : currentIndex - 1;
}

/**
 * Navigates to the next search match in a circular fashion.
 * Clears the current highlight and highlights the next match.
 */
export function navigateToNextMatch({
  editor,
  matchData,
  currentMatchIndex,
  setCurrentMatchIndex,
  highlightedNodeKeyRef,
}: {
  editor: LexicalEditor;
  matchData: MatchData[];
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  highlightedNodeKeyRef: RefObject<string | null>;
}): void {
  if (matchData.length === 0) return;

  clearHighlight(editor, highlightedNodeKeyRef);
  const nextIndex = getNextMatchIndex(currentMatchIndex, matchData.length);

  setCurrentMatchIndex(nextIndex);
  const highlightedNodeKey = highlightMatch(editor, matchData[nextIndex]);
  if (highlightedNodeKeyRef.current !== undefined) {
    highlightedNodeKeyRef.current = highlightedNodeKey;
  }
}

/**
 * Navigates to the previous search match in a circular fashion.
 * Clears the current highlight and highlights the previous match.
 */
export function navigateToPreviousMatch({
  editor,
  matchData,
  currentMatchIndex,
  setCurrentMatchIndex,
  highlightedNodeKeyRef,
}: {
  editor: LexicalEditor;
  matchData: MatchData[];
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  highlightedNodeKeyRef: RefObject<string | null>;
}): void {
  if (matchData.length === 0) return;

  clearHighlight(editor, highlightedNodeKeyRef);
  const prevIndex = getPreviousMatchIndex(currentMatchIndex, matchData.length);

  setCurrentMatchIndex(prevIndex);
  const highlightedNodeKey = highlightMatch(editor, matchData[prevIndex]);
  if (highlightedNodeKeyRef.current !== undefined) {
    highlightedNodeKeyRef.current = highlightedNodeKey;
  }
}
