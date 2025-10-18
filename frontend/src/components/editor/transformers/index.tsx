import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
  CHECK_LIST,
} from '@lexical/markdown';

// Import custom transformers
import { CODE_TRANSFORMER } from './code';
import { EQUATION } from './equation';
import { FILE_TRANSFORMER } from './file';
import { LINK } from './link';
import { TABLE } from './table';

// Export all transformers
export const CUSTOM_TRANSFORMERS = [
  HEADING,
  UNORDERED_LIST,
  ORDERED_LIST,
  CHECK_LIST,
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
