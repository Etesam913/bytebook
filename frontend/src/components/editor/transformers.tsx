import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  type ElementTransformer,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  type TextFormatTransformer,
  type TextMatchTransformer,
  UNORDERED_LIST,
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
import {
  $createNodeSelection,
  $createTextNode,
  $getEditor,
  $isParagraphNode,
  $isTextNode,
  $setSelection,
  type LexicalNode,
} from 'lexical';
import { Languages, validLanguages, type ResizeWidth } from '../../types';

import {
  addQueryParam,
  escapeFileContentForMarkdown,
  escapeQuotes,
  flattenHtml,
  getQueryParamValue,
  removeQueryParam,
  unescapeFileContentFromMarkdown,
} from '../../utils/string-formatting';
import { $createCodeNode, $isCodeNode, CodeNode } from './nodes/code';
import {
  $createExcalidrawNode,
  $isExcalidrawNode,
  ExcalidrawNode,
} from './nodes/excalidraw';
import { $createFileNode, $isFileNode, FileNode } from './nodes/file';
import {
  $createInlineEquationNode,
  $isInlineEquationNode,
  InlineEquationNode,
} from './nodes/inline-equation.tsx';
import { $createLinkNode, $isLinkNode, LinkNode } from './nodes/link';
import type { Transformer } from './utils/note-metadata';
import { getDefaultCodeForLanguage } from '../../utils/code.ts';

export const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/;

const srcRegex = /\/notes\/([^/]+)\/([^/]+)\//;

/** Updates image src when location pathname changes, should revisit this */
function updateSrc(nodeSrc: string) {
  // If it is coming from file-server update url if the folder name or note title changes
  if (!nodeSrc.includes('localhost')) {
    return nodeSrc;
  }
  const urlSplit = location.pathname.split('/');
  const currentFolder = urlSplit.at(1);

  return nodeSrc.replace(srcRegex, `/notes/${currentFolder}/`);
}

const FILE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [FileNode],
  export: (node) => {
    let filePathOrSrc = '';
    let altText = '';
    if (!$isFileNode(node)) {
      return null;
    }

    filePathOrSrc = updateSrc(node.getSrc());

    altText = addQueryParam(
      node.getAltText(),
      'width',
      String(node.getWidth())
    );

    return `![${escapeFileContentForMarkdown(altText)}](${escapeFileContentForMarkdown(filePathOrSrc)}) `;
  },
  importRegExp: /!(?:\[((?:[^\]\\]|\\.)*)\])(?:\(((?:[^()\\]|\\.)+)\))/,
  regExp: /!(?:\[((?:[^\]\\]|\\.)*)\])(?:\(((?:[^()\\]|\\.)+)\))$/,
  replace: (textNode, match) => {
    const editor = $getEditor();
    if (!editor) return;
    const alt = match.at(1);
    const filePathOrSrc = match.at(2);
    if (!alt || !filePathOrSrc) {
      textNode.replace(textNode);
      return;
    }

    const widthQueryValue = getQueryParamValue(alt, 'width');
    const width: ResizeWidth = widthQueryValue
      ? widthQueryValue.charAt(widthQueryValue.length - 1) === '%'
        ? '100%'
        : Number.parseInt(widthQueryValue)
      : '100%';

    const nodeToCreate = $createFileNode({
      alt: unescapeFileContentFromMarkdown(removeQueryParam(alt, 'width')),
      src: unescapeFileContentFromMarkdown(filePathOrSrc),
      width,
    });
    textNode.replace(nodeToCreate);
  },
  type: 'text-match',
  trigger: ')',
};

export function indexBy<T>(
  list: Array<T>,
  callback: (arg0: T) => string
): Readonly<Record<string, Array<T>>> {
  const index: Record<string, Array<T>> = {};

  for (const item of list) {
    const key = callback(item);

    if (index[key]) {
      index[key].push(item);
    } else {
      index[key] = [item];
    }
  }

  return index;
}

export function transformersByType(transformers: Array<Transformer>): Readonly<{
  element: Array<ElementTransformer>;
  textFormat: Array<TextFormatTransformer>;
  textMatch: Array<TextMatchTransformer>;
}> {
  const byType = indexBy(transformers, (t) => t.type);

  return {
    element: (byType.element || []) as Array<ElementTransformer>,
    textFormat: (byType['text-format'] || []) as Array<TextFormatTransformer>,
    textMatch: (byType['text-match'] || []) as Array<TextMatchTransformer>,
  };
}

export const CODE_TRANSFORMER: ElementTransformer = {
  dependencies: [ExcalidrawNode, CodeNode],
  export: (node: LexicalNode) => {
    if ($isCodeNode(node)) {
      const textContent = node.getCode();
      const codeLanguage = escapeQuotes(node.getLanguage());
      const id = escapeQuotes(node.getId());
      const lastExecutedResult = node.getLastExecutedResult();
      const formattedLastExecutedResult = lastExecutedResult
        ? escapeQuotes(flattenHtml(lastExecutedResult))
        : null;
      return `\`\`\`${codeLanguage} id="${id}" ${formattedLastExecutedResult ? `lastExecutedResult="${formattedLastExecutedResult}"` : ''}\n${textContent}\n\`\`\``;
    }
    if ($isExcalidrawNode(node)) {
      const textContent = JSON.stringify(node.getElements());
      return `\`\`\`drawing\n${textContent}\n\`\`\``;
    }
    return null;
  },
  regExp: /^```(\w{1,10})?\s/,
  replace: (textNode, _1, match) => {
    // MarkdownImport.ts handles the import of code blocks
    // This code handles creation for the first time
    const language = match.at(1);
    if (!language) return;
    let newNode: ExcalidrawNode | CodeNode | null = null;
    if (language === 'drawing') {
      newNode = $createExcalidrawNode({ elements: [], isCreatedNow: true });
    } else {
      if (!validLanguages.has(language as Languages)) {
        return;
      }
      // Code block data is empty by default
      newNode = $createCodeNode({
        id: crypto.randomUUID(),
        language: language as Languages,
        code: getDefaultCodeForLanguage(language as Languages),
        isCreatedNow: true,
      });
    }

    const nodeSelection = $createNodeSelection();
    nodeSelection.add(newNode.getKey());
    textNode.replace(newNode);
    $setSelection(nodeSelection);
  },
  type: 'element',
};

export const EQUATION: TextMatchTransformer = {
  dependencies: [InlineEquationNode],
  export: (node) => {
    if (!$isInlineEquationNode(node)) {
      return null;
    }

    return `$${node.getEquation()}$`;
  },
  importRegExp: /\$([^$]+?)\$/,
  regExp: /\$([^$]+?)\$$/,
  replace: (textNode, match) => {
    const [, equation] = match;
    const equationNode = $createInlineEquationNode({ equation });
    textNode.replace(equationNode);
  },
  trigger: '$',
  type: 'text-match',
};

export const LINK: TextMatchTransformer = {
  dependencies: [LinkNode],
  export: (node, _, exportFormat) => {
    if (!$isLinkNode(node)) {
      return null;
    }

    const linkContent = `[${encodeURIComponent(
      node.getTextContent()
    )}](${encodeURIComponent(node.getURL())})`;
    const firstChild = node.getFirstChild();
    // Add text styles only if link has single text node inside. If it's more
    // than one we ignore it as markdown does not support nested styles for links
    if (node.getChildrenSize() === 1) {
      if ($isTextNode(firstChild)) {
        return exportFormat(firstChild, linkContent);
      }
    }
    return linkContent;
  },
  importRegExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
  regExp:
    /(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    // eslint-disable-next-line prefer-const
    let [, linkText, linkUrl, linkTitle] = match;

    // Safely decode URI components, falling back to original if decoding fails
    try {
      linkText = decodeURIComponent(linkText);
    } catch (e) {
      // If decoding fails, use the original text (likely contains escaped markdown)
      console.warn('Failed to decode linkText:', linkText, e);
    }

    try {
      linkUrl = decodeURIComponent(linkUrl);
    } catch (e) {
      // If decoding fails, use the original URL (likely contains escaped markdown)
      console.warn('Failed to decode linkUrl:', linkUrl, e);
    }

    const linkNode = $createLinkNode(linkUrl, {
      title: linkTitle,
    });
    const linkTextNode = $createTextNode(linkText);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match',
};

// Very primitive table setup
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/;

export const TABLE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];

    for (const row of node.getChildren()) {
      const rowOutput: string[] = [];
      if (!$isTableRowNode(row)) {
        continue;
      }

      let isHeaderRow = false;
      for (const cell of row.getChildren()) {
        // It's TableCellNode so it's just to make flow happy
        if ($isTableCellNode(cell)) {
          rowOutput.push(
            $convertToMarkdownString(CUSTOM_TRANSFORMERS, cell).replace(
              /\n/g,
              '\\n'
            )
          );
          if (cell.__headerState === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(() => '---').join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
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
  return match[1].split('|').map((text) => createTableCell(text));
};

export const CUSTOM_TRANSFORMERS = [
  HEADING,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  EQUATION,
  QUOTE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  FILE_TRANSFORMER,
  LINK,
  CODE_TRANSFORMER,
  TABLE,
  INLINE_CODE,
];
