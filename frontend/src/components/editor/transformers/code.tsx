import type { MultilineElementTransformer } from '@lexical/markdown';
import { type LexicalNode } from 'lexical';
import { Languages, allLanguagesSet } from '../../../types';
import { escapeQuotes } from '../../../utils/string-formatting';
import { getDefaultCodeForLanguage } from '../../../utils/code';
import { $createCodeNode, $isCodeNode, CodeNode } from '../nodes/code';

const CODE_START_REGEX = /^```(\w{1,10})?(?:\s+(.+))?\s*$/;
const CODE_END_REGEX = /```\s?$/;

// Helper functions for parsing code block properties
function isCharAtIndexEscaped(str: string, index: number): boolean {
  let escapeCount = 0;
  let i = index - 1;
  while (i >= 0 && str[i] === '\\') {
    escapeCount++;
    i--;
  }
  return escapeCount % 2 === 1;
}

function parseOutCodeBlockId(propertiesString: string) {
  let codeBlockId: string | null = null;
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
    // Look for the code block id.
    // If found, then get the value in between the two quotes.
    // Any quotes inside the two quotes should be escaped
    const indexToEquals = i + 'id'.length;
    const indexToQuote = indexToEquals + 1;
    if (
      propertiesString.slice(i, indexToEquals + 1) === 'id=' &&
      propertiesString[indexToQuote] === '"'
    ) {
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
      codeBlockId = propertiesString.slice(indexToQuote + 1, j);
      i = j;
    }
  }
  return codeBlockId;
}

function parseLanguageAndProperties(startMatch: RegExpMatchArray | string[]): {
  language: Languages;
  id: string;
} {
  // If no language specified or not a valid language, default to 'text'
  const language =
    startMatch[1] && allLanguagesSet.has(startMatch[1] as Languages)
      ? startMatch[1]
      : 'text';

  // Parse properties from the header (everything after the language)
  const codeBlockId = startMatch[2]
    ? parseOutCodeBlockId(startMatch[2])
    : null;
  const id = codeBlockId ?? crypto.randomUUID();

  return {
    language: language as Languages,
    id,
  };
}

function extractCodeContent(
  startMatch: RegExpMatchArray | string[],
  endMatch: RegExpMatchArray | string[] | null,
  linesInBetween: string[] | null
): string {
  if (!linesInBetween) {
    // No lines in between, code will be empty
    return '';
  }

  if (linesInBetween.length === 1) {
    // Single-line code blocks
    if (endMatch) {
      // End match on same line. Example: ```markdown hello```. markdown should not be considered the language here.
      return (startMatch[1] ?? '') + linesInBetween[0];
    } else {
      // No end match. We should assume the language is next to the backticks and that code will be typed on the next line in the future
      return linesInBetween[0].startsWith(' ')
        ? linesInBetween[0].slice(1)
        : linesInBetween[0];
    }
  }

  // Treat multi-line code blocks as if they always have an end match
  const processedLines = [...linesInBetween];

  if (processedLines[0].trim().length === 0) {
    // Filter out all start and end lines that are length 0 until we find the first line with content
    while (processedLines.length > 0 && !processedLines[0].length) {
      processedLines.shift();
    }
  } else {
    // The first line already has content => Remove the first space of the line if it exists
    processedLines[0] = processedLines[0].startsWith(' ')
      ? processedLines[0].slice(1)
      : processedLines[0];
  }

  return processedLines.join('\n');
}

export const CODE_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [CodeNode],
  export: (node: LexicalNode) => {
    if (!$isCodeNode(node)) {
      return null;
    }
    const textContent = node.getCode();
    const codeLanguage = escapeQuotes(node.getLanguage());
    const id = escapeQuotes(node.getId());
    return (
      '```' +
      codeLanguage +
      ` id="${id}"` +
      (textContent ? '\n' + textContent : '') +
      '\n' +
      '```'
    );
  },
  regExpEnd: {
    optional: true,
    regExp: CODE_END_REGEX,
  },
  regExpStart: CODE_START_REGEX,
  replace: (rootNode, children, startMatch, endMatch, linesInBetween) => {
    const { language, id } = parseLanguageAndProperties(startMatch);

    let code = extractCodeContent(
      startMatch,
      endMatch,
      !children ? linesInBetween : null
    );

    // Use default code if no content is provided
    if (!code.trim()) {
      code = getDefaultCodeForLanguage(language);
    }

    const newNode = $createCodeNode({
      id,
      language,
      code,
    });

    rootNode.append(newNode);
  },
  type: 'multiline-element',
};
