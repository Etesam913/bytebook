import { Heading1 } from '@/icons/heading-1';
import { Heading2 } from '@/icons/heading-2';
import { Heading3 } from '@/icons/heading-3';
import { Heading4 } from '@/icons/heading-4';
import { Heading5 } from '@/icons/heading-5';
import { Heading6 } from '@/icons/heading-6';

export const headingOptions = [
  { tag: 'h1', Icon: Heading1 },
  { tag: 'h2', Icon: Heading2 },
  { tag: 'h3', Icon: Heading3 },
  { tag: 'h4', Icon: Heading4 },
  { tag: 'h5', Icon: Heading5 },
  { tag: 'h6', Icon: Heading6 },
] as const;
