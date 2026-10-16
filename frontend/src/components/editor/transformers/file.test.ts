import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { $getRoot, $isElementNode, createEditor } from 'lexical';
import { $convertFromMarkdownString } from '@lexical/markdown';
// Enter the transformers <-> nodes import cycle via the index, as the app does
import './index';
import { FILE_TRANSFORMER } from './file';
import { $isFileNode, FileNode } from '../nodes/file';
import { roundTripMarkdown } from './test-utils';

type ImportedChild =
  | { type: 'file'; alt: string; src: string; width: number; height?: number }
  | { type: 'text'; text: string };

function importParagraphChildren(markdown: string) {
  const editor = createEditor({
    nodes: [FileNode],
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, [FILE_TRANSFORMER], undefined, true);
    },
    { discrete: true }
  );
  let children: ImportedChild[] = [];
  editor.read(() => {
    const paragraph = $getRoot().getFirstChild();
    if (!$isElementNode(paragraph)) return;
    children = paragraph.getChildren().map((node): ImportedChild => {
      if ($isFileNode(node)) {
        const { width, height } = node.getDimensions();
        return {
          type: 'file',
          alt: node.getAltText(),
          src: node.getSrc(),
          width,
          height,
        };
      }
      return { type: 'text', text: node.getTextContent() };
    });
  });
  return children;
}

describe('FILE_TRANSFORMER import', () => {
  it('imports images without a width using the default size', () => {
    expect(importParagraphChildren('![cat](/x.png)')).toEqual([
      {
        type: 'file',
        alt: 'cat',
        src: '/x.png',
        width: 312,
        height: undefined,
      },
    ]);
  });

  it('keeps surrounding text when the image has no width', () => {
    expect(importParagraphChildren('before ![cat](/x.png) after')).toEqual([
      { type: 'text', text: 'before ' },
      {
        type: 'file',
        alt: 'cat',
        src: '/x.png',
        width: 312,
        height: undefined,
      },
      { type: 'text', text: ' after' },
    ]);
  });

  it('imports images with an empty alt', () => {
    expect(importParagraphChildren('![](/x.png)')).toEqual([
      {
        type: 'file',
        alt: '',
        src: '/x.png',
        width: 312,
        height: undefined,
      },
    ]);
  });

  it('parses width and height from the alt text', () => {
    expect(
      importParagraphChildren('![cat?width=200&height=100](/x.png)')
    ).toEqual([
      { type: 'file', alt: 'cat', src: '/x.png', width: 200, height: 100 },
    ]);
  });

  it('ignores invalid widths', () => {
    expect(importParagraphChildren('![cat?width=abc](/x.png)')).toEqual([
      {
        type: 'file',
        alt: 'cat',
        src: '/x.png',
        width: 312,
        height: undefined,
      },
    ]);
  });
});

describe('FILE_TRANSFORMER round trip', () => {
  it('does not accumulate trailing spaces on load/save', () => {
    const markdown = 'before ![cat?width=200](/x.png) after';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
    expect(roundTripMarkdown(roundTripMarkdown(markdown))).toBe(markdown);
  });

  it('round-trips an image on its own line', () => {
    const markdown = '![cat?width=200](/x.png)';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });
});
