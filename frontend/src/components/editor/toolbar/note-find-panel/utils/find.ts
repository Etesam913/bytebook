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

  const normalizedSearchTerm = searchTerm.toLowerCase().trim();

  editor.read(() => {
    const nodes = $dfs($getRoot());
    // Storing the matches for searchTerm in each text node
    nodes.forEach(({ node }) => {
      if (!$isTextNode(node)) return;

      const nodeText = node.getTextContent().toLowerCase();
      let searchIndex = 0;
      let i = 0;

      // Simple sliding-window approach to find the matches
      while (i < nodeText.length) {
        if (nodeText[i] === normalizedSearchTerm[searchIndex]) {
          searchIndex++;

          // If the entire search term is found, add the match
          if (searchIndex === normalizedSearchTerm.length) {
            matches.push({
              start: i - normalizedSearchTerm.length + 1,
              end: i,
              nodeKey: node.getKey(),
              format: node.getFormat(),
            });
            searchIndex = 0;
          }
        } else {
          searchIndex = 0;
        }
        i++;
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
export function navigateToNextMatch(
  editor: LexicalEditor,
  matchData: MatchData[],
  currentMatchIndex: number,
  setCurrentMatchIndex: (index: number) => void,
  highlightedNodeKeyRef: RefObject<string | null>
): void {
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
export function navigateToPreviousMatch(
  editor: LexicalEditor,
  matchData: MatchData[],
  currentMatchIndex: number,
  setCurrentMatchIndex: (index: number) => void,
  highlightedNodeKeyRef: RefObject<string | null>
): void {
  if (matchData.length === 0) return;

  clearHighlight(editor, highlightedNodeKeyRef);
  const prevIndex = getPreviousMatchIndex(currentMatchIndex, matchData.length);
  setCurrentMatchIndex(prevIndex);
  const highlightedNodeKey = highlightMatch(editor, matchData[prevIndex]);
  if (highlightedNodeKeyRef.current !== undefined) {
    highlightedNodeKeyRef.current = highlightedNodeKey;
  }
}
