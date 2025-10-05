import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  type ElementTransformer,
  type TextFormatTransformer,
  type TextMatchTransformer,
  UNORDERED_LIST,
} from '@lexical/markdown';
import { type Transformer } from '../utils/note-metadata';

// Import custom transformers
import { CODE_TRANSFORMER } from './code';
import { EQUATION } from './equation';
import { FILE_TRANSFORMER } from './file';
import { LINK } from './link';
import { TABLE } from './table';

// Shared utilities
export const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/;

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

// Export all transformers
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

// Export individual transformers
export { CODE_TRANSFORMER } from './code';
export { EQUATION } from './equation';
export { FILE_TRANSFORMER } from './file';
export { LINK } from './link';
export { TABLE } from './table';
