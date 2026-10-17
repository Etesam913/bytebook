import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from 'lexical';
import { $convertToMarkdownString } from '@lexical/markdown';
import { CUSTOM_TRANSFORMERS } from './index';
import { roundTripMarkdown } from './test-utils';

function exportHighlightedCode(parts: string[], bold = false) {
  const editor = createEditor({
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      const nodes = parts.map((text, index) => {
        const node = $createTextNode(text).toggleFormat('code');
        if (index === 1) node.toggleFormat('highlight');
        if (bold) node.toggleFormat('bold');
        return node;
      });
      $getRoot().append($createParagraphNode().append(...nodes));
    },
    { discrete: true }
  );
  return editor.read(() =>
    $convertToMarkdownString(CUSTOM_TRANSFORMERS, undefined, true)
  );
}

describe('inline code export', () => {
  it('preserves a code span split by Find highlighting when saved and reopened', () => {
    const parts = ['indexMapping := bleve.', 'NewIndexMap', 'ping()'];

    const markdown = exportHighlightedCode(parts);
    const reopened = roundTripMarkdown(markdown);

    expect(markdown).toBe('`indexMapping := bleve.NewIndexMapping()`');
    expect(reopened).toBe(markdown);
    expect(roundTripMarkdown(reopened)).toBe(markdown);
  });

  it('chooses one fence for literal backticks across highlighted pieces', () => {
    const parts = ['before ', '`literal`', ' after'];

    const markdown = exportHighlightedCode(parts, true);

    expect(markdown).toBe('**`` before `literal` after ``**');
    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });

  it('keeps surrounding text and formatting outside the code span', () => {
    const markdown = '**before `code` after** and `other`';

    const reopened = roundTripMarkdown(markdown);

    expect(reopened).toBe(markdown);
  });
});
