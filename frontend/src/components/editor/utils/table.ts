import {
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $isTableCellNode,
  $isTableNode,
  $isTableSelection,
  getTableElement,
} from '@lexical/table';
import type { LexicalNode } from 'lexical';
import { $getSelection, $isRangeSelection, type LexicalEditor } from 'lexical';
import type { RefObject } from 'react';

/**
 * Checks if a given node is inside a table (either directly in a table cell
 * or nested within a table structure).
 *
 * @param node - The Lexical node to check
 * @returns true if the node is inside a table, false otherwise
 */
export function $isNodeInsideTable(node: LexicalNode | null): boolean {
  if (!node) {
    return false;
  }

  let ancestor = node.getParent();
  while (ancestor) {
    if ($isTableNode(ancestor) || $isTableCellNode(ancestor)) {
      return true;
    }
    ancestor = ancestor.getParent();
  }

  return false;
}

// This function controls the visibility and positioning of the "Table Actions" button
// based on the current lexical selection within the editor.
export function showTableCellActionsButton({
  editor,
  tableActionsRef,
  noteContainerRef,
}: {
  editor: LexicalEditor;
  tableActionsRef: RefObject<HTMLButtonElement | null>;
  noteContainerRef: RefObject<HTMLDivElement | null>;
}) {
  // Helper function to hide the actions button
  const hideTableActions = () => {
    if (tableActionsRef?.current) {
      tableActionsRef.current.style.display = 'none';
    }
  };

  // Helper function to show the actions button
  const showTableActions = () => {
    if (tableActionsRef?.current) {
      tableActionsRef.current.style.display = 'block';
    }
  };

  // Read the editor state
  editor.read(() => {
    // Get the current selection
    const selection = $getSelection();

    // If the button ref doesn't exist, just hide table actions and stop here
    if (!tableActionsRef?.current) {
      hideTableActions();
      return;
    }

    // Case 1: User's selection is a text range (e.g. caret or highlight in a cell)
    if ($isRangeSelection(selection)) {
      showTableActions();

      // Try to get the closest table cell node from the selection
      const tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode()
      );
      if (!tableCellNodeFromSelection) {
        hideTableActions();
        return;
      }

      // Get the actual DOM element for the table cell node
      const tableCellParentNodeDOM = editor.getElementByKey(
        tableCellNodeFromSelection.getKey()
      );
      if (!tableCellParentNodeDOM) {
        hideTableActions();
        return;
      }

      // Find containing table node (for validation)
      $getTableNodeFromLexicalNodeOrThrow(tableCellNodeFromSelection);

      // Get bounding rectangles for cell and container to position the button
      const tableCellRect = tableCellParentNodeDOM.getBoundingClientRect();
      const noteContainerRect =
        noteContainerRef.current?.getBoundingClientRect();
      if (!noteContainerRect) {
        hideTableActions();
        return;
      }

      // Position the actions button relative to the selected cell and the container
      tableActionsRef.current.style.top = `${tableCellRect.top - noteContainerRect.top}px`;
      tableActionsRef.current.style.right = `${noteContainerRect.right - tableCellRect.right}px`;
    }
    // Case 2: User's selection is a table selection (multiple cells selected)
    else if ($isTableSelection(selection)) {
      // Get anchor node (should be a table cell)
      const anchorNode = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode()
      );
      // If not a TableCellNode, hide actions button
      if (!$isTableCellNode(anchorNode)) {
        hideTableActions();
        return;
      }

      // Find table node and table element (for validation)
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(anchorNode);
      const tableElement = getTableElement(
        tableNode,
        editor.getElementByKey(tableNode.getKey())
      );
      if (!tableElement) {
        hideTableActions();
        return;
      }

      // Get the parent DOM element of the anchor cell
      const tableCellParentNodeDOM = editor.getElementByKey(
        anchorNode.getKey()
      );

      // If not found, hide actions
      if (tableCellParentNodeDOM === null) {
        hideTableActions();
        return;
      }
      // (No explicit positioning for table selection; could be added as needed)
    } else {
      hideTableActions();
    }
  });
}
