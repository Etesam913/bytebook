import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { easingFunctions } from '../../../../animations';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $addUpdateTag,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  IS_HIGHLIGHT,
  LexicalEditor,
  LexicalNode,
  TextNode,
} from 'lexical';
import { $dfs } from '@lexical/utils';
import { XMark } from '../../../../icons/circle-xmark';
import { Magnifier } from '../../../../icons/magnifier';
import { NavigationControls } from './navigation-controls';
import { Input } from '../../../input';
import { useOnClickOutside } from '../../../../hooks/general';

type MatchData = {
  start: number;
  end: number;
  nodeKey: string;
  format: number;
};

export function NoteFindPanel({
  isSearchOpen,
  setIsSearchOpen,
}: {
  isSearchOpen: boolean;
  setIsSearchOpen: (isSearchOpen: boolean) => void;
}) {
  const [searchValue, setSearchValue] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [editor] = useLexicalComposerContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const highlightedNodeKeyRef = useRef<string | null>(null);

  useOnClickOutside(panelRef, () => {
    clearHighlight(editor);
  });

  /**
   * Performs a case-insensitive search for the given term in the editor content.
   * Clears existing highlights and finds all matches, then highlights the first match.
   * @param searchTerm - The text to search for in the editor
   */
  function performSearch(searchTerm: string) {
    const matches: MatchData[] = [];

    // Highlights from a previous search are cleared
    clearHighlight(editor);

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
          if (nodeText[i] === searchTerm[searchIndex]) {
            searchIndex++;

            // If the entire search term is found, add the match
            if (searchIndex === searchTerm.length) {
              matches.push({
                start: i - searchTerm.length + 1,
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

    setMatchData(matches);

    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      highlightMatch(0, matches);
    } else {
      setCurrentMatchIndex(-1);
    }
  }

  /**
   * Clears the currently highlighted search match and restores its original formatting.
   * Also merges adjacent text nodes that were split during highlighting.
   * @param editor - The Lexical editor instance
   */
  function clearHighlight(editor: LexicalEditor) {
    const highlightedNodeKey = highlightedNodeKeyRef.current;
    if (!highlightedNodeKey) return;

    editor.update(
      () => {
        // Prevents the editor from being selected and stealing focus from the find input
        $addUpdateTag('skip-dom-selection');

        const node = $getNodeByKey(highlightedNodeKey);
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
              const nextSibling = parent.getChildAtIndex(
                indexOfHighlightedNode
              );
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
          highlightedNodeKeyRef.current = null;
        }
      },
      // The tag makes sure that the clearing of the highlight is not included in the history
      { tag: 'history-merge' }
    );
  }

  /**
   * Highlights a specific search match by splitting the text node and applying highlight formatting.
   * Stores the highlighted node key and original format for later restoration.
   * @param matchIndex - The index of the match to highlight
   * @param matches - Array of match data (defaults to allMatches)
   */
  function highlightMatch(
    matchIndex: number,
    matches: MatchData[] = matchData
  ) {
    if (matchIndex < 0 || matchIndex >= matches.length) return;
    let targetNodeKey: string | null = null;

    const match = matches[matchIndex];

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
      highlightedNodeKeyRef.current = targetNodeKey;

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
  }

  /**
   * Navigates to the next search match in a circular fashion.
   * Clears the current highlight and highlights the next match.
   */
  function navigateToNextMatch() {
    if (matchData.length === 0) return;

    clearHighlight(editor);
    const nextIndex = (currentMatchIndex + 1) % matchData.length;
    setCurrentMatchIndex(nextIndex);
    highlightMatch(nextIndex);
  }

  /**
   * Navigates to the previous search match in a circular fashion.
   * Clears the current highlight and highlights the previous match.
   */
  function navigateToPreviousMatch() {
    if (matchData.length === 0) return;

    clearHighlight(editor);
    const prevIndex =
      currentMatchIndex <= 0 ? matchData.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    highlightMatch(prevIndex);
  }

  /**
   * Handles closing the search panel by clearing highlights and focusing the editor.
   * Optionally selects the text that was previously highlighted for user context.
   */
  function handleClose() {
    // Clear any existing highlights before closing
    clearHighlight(editor);
    setIsSearchOpen(false);

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
      }, 50);
    }
  }

  return (
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          ref={panelRef}
          className="absolute top-16 right-6 z-50 w-96 flex items-center shadow-md bg-zinc-100 dark:bg-zinc-700 py-0.5 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 focus-within:border-(--accent-color) gap-2"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ ease: easingFunctions['ease-out-circ'] }}
        >
          <Magnifier
            width={16}
            height={16}
            className="text-zinc-500 dark:text-zinc-400"
          />

          <Input
            labelProps={{}}
            inputProps={{
              placeholder: 'Search in note...',
              value: searchValue,
              className:
                'text-sm flex-1 dark:text-zinc-100 bg-transparent outline-none border-none px-0.5',
              autoFocus: true,
              autoCapitalize: 'off',
              autoComplete: 'off',
              autoCorrect: 'off',
              spellCheck: false,
              onFocus: (e) => {
                e.target.select();
              },
              onChange: (e) => {
                const searchTerm = e.target.value;
                setSearchValue(searchTerm);
                performSearch(searchTerm.toLowerCase().trim());
              },
              onKeyDown: (e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClose();
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  e.shiftKey
                    ? navigateToPreviousMatch()
                    : navigateToNextMatch();
                }
              },
            }}
          />

          <NavigationControls
            totalMatches={matchData.length}
            currentMatchIndex={
              currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0
            }
            onPreviousMatch={navigateToPreviousMatch}
            onNextMatch={navigateToNextMatch}
          />

          <button
            onClick={handleClose}
            title="Close (Escape)"
            className="rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 "
            tabIndex={0}
            aria-label="Close search"
          >
            <XMark
              width={18}
              height={18}
              fill="currentColor"
              title="Close search"
            />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
