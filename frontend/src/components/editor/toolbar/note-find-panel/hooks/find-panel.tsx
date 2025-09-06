import { $getNodeByKey, $isTextNode, LexicalEditor } from 'lexical';
import {
  Dispatch,
  type RefObject,
  SetStateAction,
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
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

const PANEL_CLOSE_SELECT_DELAY = 50;

/**
 * Manages search state and functionality for the find panel.
 */
export function useSearch(editor: LexicalEditor) {
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const highlightedNodeKeyRef = useRef<string | null>(null);
  const [searchParams] = useSearchParams();
  const searchValue = searchParams.get('highlight');

  const handleSearch = (searchTerm: string) => {
    // Clear existing highlights
    clearHighlight(editor, highlightedNodeKeyRef);

    const matches = performSearch(editor, searchTerm);
    setMatchData(matches);

    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      const highlightedNodeKey = highlightMatch(editor, matches[0]);
      highlightedNodeKeyRef.current = highlightedNodeKey;
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  return {
    matchData,
    searchValue: searchValue ?? '',
    currentMatchIndex,
    setCurrentMatchIndex,
    highlightedNodeKeyRef,
    handleSearch,
  };
}

/**
 * Manages navigation between search matches.
 */
export function useMatchNavigation(
  editor: LexicalEditor,
  matchData: MatchData[],
  currentMatchIndex: number,
  setCurrentMatchIndex: (index: number) => void,
  highlightedNodeKeyRef: RefObject<string | null>
) {
  return {
    navigateToNextMatch: () =>
      navigateToNextMatch(
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef
      ),
    navigateToPreviousMatch: () =>
      navigateToPreviousMatch(
        editor,
        matchData,
        currentMatchIndex,
        setCurrentMatchIndex,
        highlightedNodeKeyRef
      ),
  };
}

// There is some time that has to elapse for lexical to have the nodes loaded in
const HIGHLIGHT_QUERY_PARAM_DELAY = 200;

/**
 * Handles find panel open and close behavior.
 * Also handles the highlight query param
 */
export function useFindPanelOpenAndClose({
  isSearchOpen,
  setIsSearchOpen,
  handleSearch,
  highlightedNodeKeyRef,
  currentMatchIndex,
  matchData,
}: {
  isSearchOpen: boolean;
  setIsSearchOpen: Dispatch<SetStateAction<boolean>>;
  highlightedNodeKeyRef: RefObject<string | null>;
  currentMatchIndex: number;
  matchData: MatchData[];
  handleSearch: (searchTerm: string) => void;
}) {
  const [searchParams] = useSearchParams();
  const highlightParamValue = searchParams.get('highlight');
  const [editor] = useLexicalComposerContext();

  // If there is a highlight query param, open the find panel
  useEffect(() => {
    if (highlightParamValue) {
      setIsSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    // Clear highlights if the find panel is closed
    if (!isSearchOpen) {
      clearHighlight(editor, highlightedNodeKeyRef);

      // Select the highlighted portion if there was an active match
      if (currentMatchIndex >= 0 && currentMatchIndex < matchData.length) {
        const match = matchData[currentMatchIndex];

        setTimeout(() => {
          editor.update(() => {
            const node = $getNodeByKey(match.nodeKey);
            if (node && $isTextNode(node)) {
              node.select(match.start, match.end + 1);
            }
          });
        }, PANEL_CLOSE_SELECT_DELAY);
      }
    }
    // Otherwise if search is open, make initial search with the already set search value
    else {
      setTimeout(() => {
        handleSearch(highlightParamValue?.toLowerCase().trim() ?? '');
      }, HIGHLIGHT_QUERY_PARAM_DELAY);
    }
  }, [isSearchOpen, setIsSearchOpen, handleSearch]);
}
