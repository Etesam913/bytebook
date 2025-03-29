import type {
  ElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
} from '@lexical/markdown';
import type { TextNode } from 'lexical';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  type ElementNode,
} from 'lexical';
import { $createCodeNode, CodePayload, type CodeNode } from './nodes/code';
import { $createExcalidrawNode, type ExcalidrawNode } from './nodes/excalidraw';
import { PUNCTUATION_OR_SPACE, transformersByType } from './transformers';
import type { Transformer } from './utils/note-metadata';
import { unescapeQuotes } from '../../utils/string-formatting';
import { Languages, validLanguages } from '../../types';

const CAN_USE_DOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';
const IS_CHROME: boolean =
  CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
const IS_SAFARI: boolean =
  CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
const IS_APPLE_WEBKIT =
  CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !IS_CHROME;

type TextFormatTransformersIndex = Readonly<{
  fullMatchRegExpByTag: Readonly<Record<string, RegExp>>;
  openTagsRegExp: RegExp;
  transformersByTag: Readonly<Record<string, TextFormatTransformer>>;
}>;

/* THIS CODE IS PRETTY MUCH FROM META EXCEPT SMALL MODIFICATION TO EMPTY LINE REMOVAL */

export function createMarkdownImport(
  transformers: Array<Transformer>
): (markdownString: string, node?: ElementNode) => void {
  const byType = transformersByType(transformers);
  const textFormatTransformersIndex = createTextFormatTransformersIndex(
    byType.textFormat
  );

  return (markdownString, node) => {
    const lines = markdownString.split('\n');
    const linesLength = lines.length;
    const root = node || $getRoot();
    root.clear();

    for (let i = 0; i < linesLength; i++) {
      const lineText = lines[i];
      // Codeblocks are processed first as anything inside such block
      // is ignored for further processing
      // TODO:
      // Abstract it to be dynamic as other transformers (add multiline match option)

      const [codeBlockNode, shiftedIndex] = importCodeBlock(lines, i, root);

      if (codeBlockNode !== null) {
        i = shiftedIndex;
        continue;
      }

      importBlocks(
        lineText,
        root,
        byType.element,
        textFormatTransformersIndex,
        byType.textMatch
      );
    }

    // CHANGE: REMOVED THIS, I WANT TO KEEP NEW LINES
    // const children = root.getChildren();
    // for (const child of children) {
    //   if (isEmptyParagraph(child) && root.getChildrenSize() > 1) {
    //     child.remove();
    //   }
    // }

    // $setSelection(null);
    // Below focuses the editor on markdown import
    if ($getSelection() !== null) {
      root.selectStart();
    }
  };
}

function importBlocks(
  lineText: string,
  rootNode: ElementNode,
  elementTransformers: Array<ElementTransformer>,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: Array<TextMatchTransformer>
) {
  const lineTextTrimmed = lineText.trim();
  const textNode = $createTextNode(lineTextTrimmed);
  const elementNode = $createParagraphNode();
  elementNode.append(textNode);
  rootNode.append(elementNode);
  for (const { regExp, replace } of elementTransformers) {
    const match = lineText.match(regExp);

    if (match) {
      textNode.setTextContent(lineText.slice(match[0].length));
      replace(elementNode, [textNode], match, true);
      break;
    }
  }

  importTextFormatTransformers(
    textNode,
    textFormatTransformersIndex,
    textMatchTransformers
  );

  // If no transformer found and we left with original paragraph node
  // can check if its content can be appended to the previous node
  // if it's a paragraph, quote or list
  // if (elementNode.isAttached() && lineTextTrimmed.length > 0) {
  //   const previousNode = elementNode.getPreviousSibling();
  //   if (
  //     $isParagraphNode(previousNode) ||
  //     $isQuoteNode(previousNode) ||
  //     $isListNode(previousNode)
  //   ) {
  //     // let targetNode: typeof previousNode | ListItemNode | null = previousNode;

  //     // if ($isListNode(previousNode)) {
  //     //   const lastDescendant = previousNode.getLastDescendant();
  //     //   if (lastDescendant == null) {
  //     //     targetNode = null;
  //     //   } else {
  //     //     targetNode = $findMatchingParent(lastDescendant, $isListItemNode);
  //     //   }
  //     // }

  //     // This is an optimization to use the previous node and just add a line break, but doing this breaks certain stuff
  //     // if (targetNode != null && targetNode.getTextContentSize() > 0) {
  //     // 	targetNode.splice(targetNode.getChildrenSize(), 0, [
  //     // 		$createLineBreakNode(),
  //     // 		...elementNode.getChildren(),
  //     // 	]);
  //     // 	elementNode.remove();
  //     // }
  //   }
  // }
}
const CODE_BLOCK_REG_EXP = /^```(\w{1,10})?(?:\s+(.+))?\s*$/;

function isCharAtIndexEscaped(strToCheck: string, index: number) {
  if (index === 0) return false;
  return strToCheck[index - 1] === '\\';
}
// id="d5f5ed67-4552-4f32-aeb5-ad4c566ad16a" isCollapsed="false"
function parseOutCodeBlockHeaderProperties(propertiesString: string) {
  const propertyMap = new Map<string, string>();
  const properties = ['isCollapsed', 'id', 'lastExecutedResult'];
  for (let i = 0; i < propertiesString.length; i += 1) {
    // If a quote is found without a known property value, then loop until the end of the property value
    if (
      propertiesString[i] === '"' &&
      !isCharAtIndexEscaped(propertiesString, i)
    ) {
      i += 1;
      // Continue updating i until either the end of the string is hit or
      // A quote is found without being escaped
      while (
        i < propertiesString.length &&
        (propertiesString[i] !== '"' ||
          (propertiesString[i] === '"' &&
            isCharAtIndexEscaped(propertiesString, i)))
      ) {
        i += 1;
      }
    }
    // Look for occurences of the property
    // If found, then get the value in between the two quotes.
    // Any quotes inside the two quotes should be escaped
    for (const property of properties) {
      const indexToEndOfProperty = i + property.length - 1;
      const indexToEquals = indexToEndOfProperty + 1;
      const indexToQuote = indexToEquals + 1;
      // +1 at the end to account for the = sign
      const nextPropertyLengthCharacters = propertiesString.slice(
        i,
        indexToEquals + 1
      );
      if (nextPropertyLengthCharacters === property + '=') {
        // Property found outside of a property value
        let j = indexToQuote + 1;
        // Getting to the end of the quote while skipping escaped quotes
        while (
          j < propertiesString.length &&
          (propertiesString[j] !== '"' ||
            (propertiesString[j] === '"' &&
              isCharAtIndexEscaped(propertiesString, j)))
        ) {
          j += 1;
        }
        const propertyValue = propertiesString.slice(indexToQuote + 1, j);
        propertyMap.set(property, propertyValue);
        i = j;
        break;
      }
    }
  }
  return propertyMap;
}

function importCodeBlock(
  lines: Array<string>,
  startLineIndex: number,
  rootNode: ElementNode
): [CodeNode | ExcalidrawNode | null, number] {
  const openMatch = lines[startLineIndex].match(CODE_BLOCK_REG_EXP);
  if (openMatch) {
    let endLineIndex = startLineIndex;
    const linesLength = lines.length;

    while (++endLineIndex < linesLength) {
      const closeMatch = lines[endLineIndex].match(CODE_BLOCK_REG_EXP);
      if (closeMatch) {
        const language = (openMatch[1] ?? 'python') as Languages | 'drawing';

        if (language === 'drawing') {
          const elementsString = lines
            .slice(startLineIndex + 1, endLineIndex)
            .join('\n');
          const elements = JSON.parse(elementsString);
          const excalidrawNode = $createExcalidrawNode({ elements });
          rootNode.append(excalidrawNode);
          return [excalidrawNode, endLineIndex];
        }

        // If not drawing then it is a code block
        const codeBlockParams = {
          id: crypto.randomUUID() as string,
          isCollapsed: false as boolean,
          lastExecutedResult: null as string | null,
          language,
          code: '',
        } satisfies CodePayload;

        const cleanedMatches = openMatch.filter((match) => match !== undefined);
        const codeBlockHeader = cleanedMatches[cleanedMatches.length - 1];
        const headerProperties =
          parseOutCodeBlockHeaderProperties(codeBlockHeader);

        if (headerProperties.has('id')) {
          codeBlockParams.id = headerProperties.get('id')!;
        }
        if (headerProperties.has('isCollapsed')) {
          codeBlockParams.isCollapsed =
            headerProperties.get('isCollapsed') === 'true';
        }
        if (headerProperties.has('lastExecutedResult')) {
          const value = headerProperties.get('lastExecutedResult');
          codeBlockParams.lastExecutedResult = value
            ? unescapeQuotes(value)
            : null;
        }
        codeBlockParams.code = lines
          .slice(startLineIndex + 1, endLineIndex)
          .join('\n');
        if (!validLanguages.has(language)) {
          return [null, startLineIndex];
        }
        const codeBlockNode = $createCodeNode({
          id: codeBlockParams.id,
          language: codeBlockParams.language,
          code: codeBlockParams.code,
          lastExecutedResult: codeBlockParams.lastExecutedResult,
          isCollapsed: codeBlockParams.isCollapsed,
        });
        rootNode.append(codeBlockNode);
        return [codeBlockNode, endLineIndex];
      }
    }
  }
  return [null, startLineIndex];
}

// Processing text content and replaces text format tags.
// It takes outermost tag match and its content, creates text node with
// format based on tag and then recursively executed over node's content
//
// E.g. for "*Hello **world**!*" string it will create text node with
// "Hello **world**!" content and italic format and run recursively over
// its content to transform "**world**" part
function importTextFormatTransformers(
  textNode: TextNode,
  textFormatTransformersIndex: TextFormatTransformersIndex,
  textMatchTransformers: Array<TextMatchTransformer>
) {
  const textContent = textNode.getTextContent();
  const match = findOutermostMatch(textContent, textFormatTransformersIndex);

  if (!match) {
    // Once text format processing is done run text match transformers, as it
    // only can span within single text node (unline formats that can cover multiple nodes)
    importTextMatchTransformers(textNode, textMatchTransformers);
    return;
  }
  let currentNode: TextNode | null = null;
  let remainderNode: TextNode | null = null;
  let leadingNode: TextNode | null = null;

  // If matching full content there's no need to run splitText and can reuse existing textNode
  // to update its content and apply format. E.g. for **_Hello_** string after applying bold
  // format (**) it will reuse the same text node to apply italic (_)
  if (match[0] === textContent) {
    currentNode = textNode;
  } else {
    const startIndex = match.index || 0;
    const endIndex = startIndex + match[0].length;

    if (startIndex === 0) {
      [currentNode, remainderNode] = textNode.splitText(endIndex);
    } else {
      [leadingNode, currentNode, remainderNode] = textNode.splitText(
        startIndex,
        endIndex
      );
    }
  }

  currentNode.setTextContent(match[2]);
  const transformer = textFormatTransformersIndex.transformersByTag[match[1]];

  if (transformer) {
    for (const format of transformer.format) {
      if (!currentNode.hasFormat(format)) {
        currentNode.toggleFormat(format);
      }
    }
  }

  // Recursively run over inner text if it's not inline code
  if (!currentNode.hasFormat('code')) {
    importTextFormatTransformers(
      currentNode,
      textFormatTransformersIndex,
      textMatchTransformers
    );
  }

  // Run over leading/remaining text if any
  if (leadingNode) {
    importTextFormatTransformers(
      leadingNode,
      textFormatTransformersIndex,
      textMatchTransformers
    );
  }

  if (remainderNode) {
    importTextFormatTransformers(
      remainderNode,
      textFormatTransformersIndex,
      textMatchTransformers
    );
  }
}

function importTextMatchTransformers(
  textNode_: TextNode,
  textMatchTransformers: Array<TextMatchTransformer>
) {
  let textNode = textNode_;

  mainLoop: while (textNode) {
    for (const transformer of textMatchTransformers) {
      if (!transformer.replace || !transformer.importRegExp) {
        continue;
      }
      const match = textNode.getTextContent().match(transformer.importRegExp);

      if (!match) {
        continue;
      }

      const startIndex = match.index || 0;
      const endIndex = startIndex + match[0].length;
      let replaceNode: TextNode | null = null;
      let newTextNode: TextNode | null = null;

      if (startIndex === 0) {
        [replaceNode, textNode] = textNode.splitText(endIndex);
      } else {
        [, replaceNode, newTextNode] = textNode.splitText(startIndex, endIndex);
      }

      if (newTextNode) {
        importTextMatchTransformers(newTextNode, textMatchTransformers);
      }
      transformer.replace(replaceNode, match);
      continue mainLoop;
    }

    break;
  }
}

// Finds first "<tag>content<tag>" match that is not nested into another tag
function findOutermostMatch(
  textContent: string,
  textTransformersIndex: TextFormatTransformersIndex
): RegExpMatchArray | null {
  const openTagsMatch = textContent.match(textTransformersIndex.openTagsRegExp);

  if (openTagsMatch == null) {
    return null;
  }

  for (const match of openTagsMatch) {
    // Open tags reg exp might capture leading space so removing it
    // before using match to find transformer
    const tag = match.replace(/^\s/, '');
    const fullMatchRegExp = textTransformersIndex.fullMatchRegExpByTag[tag];
    if (fullMatchRegExp == null) {
      continue;
    }

    const fullMatch = textContent.match(fullMatchRegExp);
    const transformer = textTransformersIndex.transformersByTag[tag];
    if (fullMatch != null && transformer != null) {
      if (transformer.intraword !== false) {
        return fullMatch;
      }

      // For non-intraword transformers checking if it's within a word
      // or surrounded with space/punctuation/newline
      const { index = 0 } = fullMatch;
      const beforeChar = textContent[index - 1];
      const afterChar = textContent[index + fullMatch[0].length];

      if (
        (!beforeChar || PUNCTUATION_OR_SPACE.test(beforeChar)) &&
        (!afterChar || PUNCTUATION_OR_SPACE.test(afterChar))
      ) {
        return fullMatch;
      }
    }
  }

  return null;
}

function createTextFormatTransformersIndex(
  textTransformers: Array<TextFormatTransformer>
): TextFormatTransformersIndex {
  const transformersByTag: Record<string, TextFormatTransformer> = {};
  const fullMatchRegExpByTag: Record<string, RegExp> = {};
  const openTagsRegExp: string[] = [];
  const escapeRegExp = '(?<![\\\\])';

  for (const transformer of textTransformers) {
    const { tag } = transformer;
    transformersByTag[tag] = transformer;
    const tagRegExp = tag.replace(/(\*|\^|\+)/g, '\\$1');
    openTagsRegExp.push(tagRegExp);

    if (IS_SAFARI || IS_APPLE_WEBKIT) {
      fullMatchRegExpByTag[tag] = new RegExp(
        `(${tagRegExp})(?![${tagRegExp}\\s])(.*?[^${tagRegExp}\\s])${tagRegExp}(?!${tagRegExp})`
      );
    } else {
      fullMatchRegExpByTag[tag] = new RegExp(
        `(?<![\\\\${tagRegExp}])(${tagRegExp})((\\\\${tagRegExp})?.*?[^${tagRegExp}\\s](\\\\${tagRegExp})?)((?<!\\\\)|(?<=\\\\\\\\))(${tagRegExp})(?![\\\\${tagRegExp}])`
      );
    }
  }

  return {
    // Reg exp to find open tag + content + close tag
    fullMatchRegExpByTag,
    // Reg exp to find opening tags
    openTagsRegExp: new RegExp(
      `${
        IS_SAFARI || IS_APPLE_WEBKIT ? '' : `${escapeRegExp}`
      }(${openTagsRegExp.join('|')})`,
      'g'
    ),
    transformersByTag,
  };
}
