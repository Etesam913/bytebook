import { $isTableCellNode, $isTableNode } from '@lexical/table';
import type { LexicalNode } from 'lexical';

export const MAX_TABLE_ROWS = 100;
export const MAX_TABLE_COLUMNS = 10;

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
