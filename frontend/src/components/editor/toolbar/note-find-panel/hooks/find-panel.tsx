import {
  $getNodeByKey,
  $getSelection,
  $isTextNode,
  $setSelection,
  BaseSelection,
  LexicalEditor,
} from 'lexical';
import {
  Dispatch,
  SetStateAction,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'wouter';
import { MatchData, clearHighlight, highlightMatch } from '../utils/highlight';
import {
  performSearch,
  navigateToNextMatch,
  navigateToPreviousMatch,
} from '../utils/find';

function areMatchesEqual(
  matches1: MatchData[],
  matches2: MatchData[]
): boolean {
  if (matches1.length !== matches2.length) return false;
  return matches1.every(
    (match, index) =>
      match.nodeKey === matches2[index].nodeKey &&
      match.start === matches2[index].start &&
      match.end === matches2[index].end &&
      match.format === matches2[index].format
  );
}

/**
 * Manages search state and functionality for the find panel.
 */
export function useFindPanelSearch({
  editor,
  isSearchOpen,
  inputRef,
  setIsSearchOpen,
  hasFirstLoad,
}: {
  editor: LexicalEditor;
  isSearchOpen: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  setIsSearchOpen: Dispatch<SetStateAction<boolean>>;
  // Ensures that the search is only performed after the first load of the note markdown
  hasFirstLoad: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const highlightedNodeKeyRef = useRef<string | null>(null);
  const previousSelectionRef = useRef<BaseSelection | null>(null);

  const highlightParam = searchParams.get('highlight') || '';

  // Wrapper to keep ref in sync with state
  const setCurrentMatchIndexWithRef = (index: number) => {
    setCurrentMatchIndex(index);
  };

  /**
   * Updates the highlight URL parameter.
   */
  const setHighlightParam = (value: string) => {
    return setSearchParams((prev) => {
      const params = Object.fromEntries(prev.entries());
      if (value) params.highlight = value;
      else delete params.highlight;
      return params;
    });
  };

  /**
   * Performs a search for the given term in the editor, updates the match data,
   * highlights the first match if any, and sets the current match index.
   */
  const handleSearch = (searchTerm: string) => {
    setIsSearchOpen(true);
    clearHighlight(editor, highlightedNodeKeyRef);

    const matches = performSearch(editor, searchTerm);

    // Use the same currentMatchIndex if the matches are the same.
    // Ex: searching for "apple", closing find panel and then opening it again.
    const shouldPreserveIndex = areMatchesEqual(matches, matchData);

    setMatchData(matches);

    if (matches.length === 0) {
      setCurrentMatchIndexWithRef(-1);
      return;
    }

    // Preserve current index if matches are the same and index is valid
    if (
      shouldPreserveIndex &&
      currentMatchIndex >= 0 &&
      currentMatchIndex < matches.length
    ) {
      const highlightedNodeKey = highlightMatch(
        editor,
        matches[currentMatchIndex]
      );
      highlightedNodeKeyRef.current = highlightedNodeKey;
      return;
    }

    // Default to first match
    setCurrentMatchIndexWithRef(0);
    const highlightedNodeKey = highlightMatch(editor, matches[0]);
    highlightedNodeKeyRef.current = highlightedNodeKey;
  };

  // Effect to handle panel open/close logic
  useEffect(() => {
    if (!hasFirstLoad) return;
    if (isSearchOpen) {
      // The panel is open store current selection when opening so selection can be restored when closing
      editor.read(() => {
        const selection = $getSelection();
        previousSelectionRef.current = selection?.clone() ?? null;
      });

      // Ensure input is focused
      if (inputRef.current && inputRef.current !== document.activeElement) {
        inputRef.current.focus();
      }
    } else {
      // The panel is closed, clear all search highlights and restore selection to editor
      clearHighlight(editor, highlightedNodeKeyRef);

      // Restore selection after animation
      const timeoutId = setTimeout(() => {
        editor.update(() => {
          // Use refs to access current values without causing re-renders
          // const currentIndex = currentMatchIndex;
          // const currentMatchData = matchData;
          const isMatchInBounds =
            currentMatchIndex >= 0 && currentMatchIndex < matchData.length;

          // If we had an active match, select it
          if (isMatchInBounds) {
            const match = matchData[currentMatchIndex];
            const node = $getNodeByKey(match.nodeKey);
            if (node && $isTextNode(node)) {
              node.select(match.start, match.end + 1);
            }
          }
          // Otherwise restore previous selection
          else if (previousSelectionRef.current) {
            $setSelection(previousSelectionRef.current);
          }
        });
      }, 200);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isSearchOpen, editor, inputRef, hasFirstLoad]);

  // Separate effect to handle search when highlightParam changes
  useEffect(() => {
    if (highlightParam && hasFirstLoad) {
      queueMicrotask(() => handleSearch(highlightParam));
    }
  }, [highlightParam, hasFirstLoad]);

  return {
    matchData,
    highlightParam,
    setHighlightParam,
    currentMatchIndex,
    setCurrentMatchIndex: setCurrentMatchIndexWithRef,
    highlightedNodeKeyRef,
  };
}

/**
 * Manages navigation between search matches.
 */
export function useMatchNavigation({
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
}) {
  return {
    navigateToNextMatch: () => {
      return navigateToNextMatch({
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef,
      });
    },
    navigateToPreviousMatch: () => {
      return navigateToPreviousMatch({
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef,
      });
    },
  };
}
