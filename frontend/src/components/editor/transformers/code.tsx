import type { MultilineElementTransformer } from '@lexical/markdown';
import { type LexicalNode } from 'lexical';
import { LANGUAGES, Languages, allLanguagesSet } from '@/types';
import { getDefaultCodeForLanguage } from '@utils/code';
import { $createCodeNode, $isCodeNode, CodeNode } from '../nodes/code';
import {
  escapeQuotes,
  unescapeQuotes,
} from '@components/editor/utils/markdown-links';

const CODE_START_REGEX = /^```(\w{1,10})?(?:\s+(.+))?\s*$/;
const CODE_END_REGEX = /```\s?$/;

function parseOutCodeBlockId(propertiesString: string) {
  let codeBlockId: string | null = null;
  // Consume quoted values as a whole so an id inside another value is ignored.
  const tokens = propertiesString.matchAll(
    /\\[\\"]|id="((?:\\.|[^"\\])*)(?:"|$)|"(?:\\.|[^"\\])*(?:"|$)/g
  );
  for (const token of tokens) {
    if (token[1] !== undefined) codeBlockId = unescapeQuotes(token[1]);
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
      : LANGUAGES.TEXT;

  // Parse properties from the header (everything after the language)
  const codeBlockId = startMatch[2] ? parseOutCodeBlockId(startMatch[2]) : null;
  const id = codeBlockId ?? crypto.randomUUID();

  return {
    language: language as Languages,
    id,
  };
}

export function extractCodeContent(
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

  // Lexical includes the remainder of the opening fence line as the first entry
  // and the text before the closing fence as the last; drop them when empty.
  const processedLines = [...linesInBetween];

  if (processedLines[0].trim().length === 0) {
    processedLines.shift();
  } else if (processedLines[0].startsWith(' ')) {
    processedLines[0] = processedLines[0].slice(1);
  }

  if (endMatch && processedLines.at(-1)?.trim().length === 0) {
    processedLines.pop();
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
