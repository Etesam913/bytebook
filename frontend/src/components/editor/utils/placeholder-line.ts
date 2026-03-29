import { $isRangeSelection, $getSelection, type LexicalEditor } from 'lexical';
import type { ElementNode, RangeSelection } from 'lexical';
import { type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { PlaceholderLineData } from '../types';
import { $isTextNode, $isParagraphNode } from 'lexical';
import { $isNodeInsideTable } from './table';

function getLineParentNodeFromSelection(selection: RangeSelection) {
  const anchorNode = selection.anchor.getNode();
  return $isTextNode(anchorNode) ? anchorNode.getParent() : anchorNode;
}

function isValidEmptyParagraph(parentNode: ElementNode): boolean {
  const isParagraph = parentNode && $isParagraphNode(parentNode);
  const isInsideTable = isParagraph && $isNodeInsideTable(parentNode);
  if (!isParagraph || isInsideTable) return false;

  // Check for child nodes (should be empty)
  if (typeof parentNode.getChildren === 'function') {
    const children = parentNode.getChildren();
    if (children.length > 0) return false;
  }

  // Check for text content (should be empty)
  const textContent = parentNode.getTextContent();
  if (textContent.length > 0) return false;

  return true;
}

// Get the element's position relative to its container
function getRelativePosition(element: HTMLElement, container: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    top: rect.top - containerRect.top,
    left: rect.left - containerRect.left,
  };
}

function hidePlaceholder(
  setPlaceholderLineData: Dispatch<SetStateAction<PlaceholderLineData>>
) {
  setPlaceholderLineData({
    show: false,
    position: { top: 0, left: 0 },
    parentKey: null,
  });
}

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

    // Only show placeholder for collapsed range selection
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      hidePlaceholder(setPlaceholderLineData);
      return;
    }

    const parentNode = getLineParentNodeFromSelection(selection);

    if (!parentNode || !isValidEmptyParagraph(parentNode)) {
      hidePlaceholder(setPlaceholderLineData);
      return;
    }

    const parentKey = parentNode.getKey();
    const parentDOM = editor.getElementByKey(parentKey);

    if (!parentDOM || !noteContainerRef.current) {
      hidePlaceholder(setPlaceholderLineData);
      return;
    }

    const position = getRelativePosition(parentDOM, noteContainerRef.current);

    setPlaceholderLineData({
      show: true,
      parentKey,
      position,
    });
  });
}
