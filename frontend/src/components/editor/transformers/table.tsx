import type { ElementTransformer } from '@lexical/markdown';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import { $isParagraphNode, $isTextNode, type LexicalNode } from 'lexical';
import { CUSTOM_TRANSFORMERS } from './index';

// Very primitive table setup
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/;

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

const createTableCell = (textContent: string): TableCellNode => {
  const cleanedTextContent = textContent.replace(/\\n/g, '\n');
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  $convertFromMarkdownString(cleanedTextContent, CUSTOM_TRANSFORMERS, cell);
  return cell;
};

const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].split('|').map((text) => createTableCell(text.trim()));
};

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const rows: string[][] = [];
    const headerRows: number[] = [];

    // First pass: collect all cell contents and identify header rows
    for (const row of node.getChildren()) {
      if (!$isTableRowNode(row)) {
        continue;
      }

      const rowOutput: string[] = [];
      let isHeaderRow = false;

      for (const cell of row.getChildren()) {
        if ($isTableCellNode(cell)) {
          rowOutput.push(
            $convertToMarkdownString(CUSTOM_TRANSFORMERS, cell, true).replace(
              /\n/g,
              '\\n'
            )
          );
          if (cell.__headerState === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      rows.push(rowOutput);
      if (isHeaderRow) {
        headerRows.push(rows.length - 1);
      }
    }

    // Calculate max width for each column (minimum width of 3 for proper markdown formatting)
    const columnWidths: number[] = [];
    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const cellWidth = row[i].length;
        columnWidths[i] = Math.max(columnWidths[i] || 0, cellWidth, 3);
      }
    }

    // Second pass: format output with padding
    const output: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const paddedCells = row.map((cell, colIndex) => {
        return cell.padEnd(columnWidths[colIndex] || 0, ' ');
      });
      output.push(`| ${paddedCells.join(' | ')} |`);

      if (headerRows.includes(i)) {
        const dividerCells = columnWidths.map((width) => '-'.repeat(width));
        output.push(`| ${dividerCells.join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _children, match) => {
    void _children;
    // Header row
    if (TABLE_ROW_DIVIDER_REG_EXP.test(match[0])) {
      const table = parentNode.getPreviousSibling();
      if (!table || !$isTableNode(table)) {
        return;
      }

      const rows = table.getChildren();
      const lastRow = rows[rows.length - 1];
      if (!lastRow || !$isTableRowNode(lastRow)) {
        return;
      }

      // Add header state to row cells
      lastRow.getChildren().forEach((cell) => {
        if (!$isTableCellNode(cell)) {
          return;
        }
        cell.toggleHeaderStyle(TableCellHeaderStates.ROW);
      });

      // Remove line
      parentNode.remove();
      return;
    }

    const matchCells = mapToTableCells(match[0]);

    if (matchCells == null) {
      return;
    }

    const rows = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling)) {
        break;
      }

      if (sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const cells = mapToTableCells(firstChild.getTextContent());

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = $createTableNode();

    for (const cells of rows) {
      const tableRow = $createTableRowNode();
      table.append(tableRow);

      for (let i = 0; i < maxCells; i++) {
        tableRow.append(i < cells.length ? cells[i] : createTableCell(''));
      }
    }

    const previousSibling = parentNode.getPreviousSibling();
    if (
      $isTableNode(previousSibling) &&
      getTableColumnsSize(previousSibling) === maxCells
    ) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
    } else {
      parentNode.replace(table);
    }

    table.selectEnd();
  },
  type: 'element',
};
