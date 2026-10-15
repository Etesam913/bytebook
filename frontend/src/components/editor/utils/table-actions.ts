/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getNodeTriplet,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  type TableCellNode,
} from '@lexical/table';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type ElementNode,
} from 'lexical';

export function $canUnmerge(): boolean {
  const selection = $getSelection();
  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false;
  }
  // $getNodeTriplet throws when the selection is outside a table (e.g. on remount).
  if (!$getTableCellNodeFromLexicalNode(selection.anchor.getNode())) {
    return false;
  }
  const [cell] = $getNodeTriplet(selection.anchor);
  return cell.__colSpan > 1 || cell.__rowSpan > 1;
}

function $selectLastDescendant(node: ElementNode): void {
  const lastDescendant = node.getLastDescendant();
  if ($isTextNode(lastDescendant)) {
    lastDescendant.select();
  } else if ($isElementNode(lastDescendant)) {
    lastDescendant.selectEnd();
  } else if (lastDescendant !== null) {
    lastDescendant.selectNext();
  }
}

// Call inside an editor update; hover controls select their target cell first.
export const $tableActions: Record<string, (cell: TableCellNode) => void> = {
  'insert-row-above': () => $insertTableRowAtSelection(false),
  'insert-row-below': () => $insertTableRowAtSelection(true),
  'insert-column-left': () => $insertTableColumnAtSelection(false),
  'insert-column-right': () => $insertTableColumnAtSelection(true),
  'delete-column': $deleteTableColumnAtSelection,
  'delete-row': $deleteTableRowAtSelection,
  'delete-table': (cell) => {
    $getTableNodeFromLexicalNodeOrThrow(cell).remove();
    $setSelection(null);
  },
  'merge-cells': () => {
    const selection = $getSelection();
    if (!$isTableSelection(selection)) return;
    const targetCell = $mergeCells(
      selection.getNodes().filter($isTableCellNode)
    );
    if (targetCell) $selectLastDescendant(targetCell);
  },
  'unmerge-cells': $unmergeCell,
};
