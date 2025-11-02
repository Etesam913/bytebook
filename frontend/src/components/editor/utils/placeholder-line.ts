import { $isRangeSelection, $getSelection, type LexicalEditor } from 'lexical';
import { Dispatch, RefObject, SetStateAction } from 'react';
import type { PlaceholderLineData } from '../types';
import { $isTextNode, $isParagraphNode } from 'lexical';
import { $isNodeInsideTable } from './table';

/**
 * Updates placeholder line data based on the current selection
 */
export function updatePlaceholderLineData({
  editor,
  noteContainerRef,
  setPlaceholderLineData,
}: {
  editor: LexicalEditor;
  noteContainerRef: RefObject<HTMLDivElement | null>;
  setPlaceholderLineData: Dispatch<SetStateAction<PlaceholderLineData>>;
}) {
  editor.getEditorState().read(() => {
    const selection = $getSelection();

    // Check if we have a range selection (not node selection)
    if (!$isRangeSelection(selection)) {
      setPlaceholderLineData({
        show: false,
        position: { top: 0, left: 0 },
        parentKey: null,
      });
      return;
    }

    // Check if selection is collapsed (empty, just a cursor)
    if (!selection.isCollapsed()) {
      setPlaceholderLineData({
        show: false,
        position: { top: 0, left: 0 },
        parentKey: null,
      });
      return;
    }

    // Get the anchor node (where the cursor is)
    const anchorNode = selection.anchor.getNode();

    // Get the parent element to check if the whole line is empty
    const parentNode = $isTextNode(anchorNode)
      ? anchorNode.getParent()
      : anchorNode;

    // Check if parentNode is not a paragraph or if it is inside a table
    const isParagraph = parentNode && $isParagraphNode(parentNode);
    const isInsideTable = isParagraph && $isNodeInsideTable(parentNode);

    if (!isParagraph || isInsideTable) {
      setPlaceholderLineData({
        show: false,
        position: { top: 0, left: 0 },
        parentKey: null,
      });
      return;
    }

    // Check if the parent node (usually a paragraph) has any text content
    const textContent = parentNode.getTextContent();

    if (textContent.length > 0) {
      setPlaceholderLineData({
        show: false,
        position: { top: 0, left: 0 },
        parentKey: null,
      });
      return;
    }

    // Get the DOM element for positioning
    const parentKey = parentNode.getKey();
    const parentDOM = editor.getElementByKey(parentKey);

    if (!parentDOM || !noteContainerRef.current) {
      setPlaceholderLineData({
        show: false,
        position: { top: 0, left: 0 },
        parentKey: null,
      });
      return;
    }

    // Get the bounding rect of the parent element and the container
    const rect = parentDOM.getBoundingClientRect();
    const containerRect = noteContainerRef.current.getBoundingClientRect();

    // Calculate position relative to the container
    setPlaceholderLineData({
      show: true,
      parentKey,
      position: {
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left,
      },
    });
  });
}
