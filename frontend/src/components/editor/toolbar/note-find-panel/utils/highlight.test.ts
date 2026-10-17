import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  IS_BOLD,
  IS_ITALIC,
  IS_CODE,
} from 'lexical';
// Enter the transformers/nodes import cycle through its index, as the app does.
import '../../../transformers';
import { editorConfig } from '../../../editor-config';
import { performSearch } from './find';
import { clearHighlight, highlightMatch } from './highlight';

function createFormattedEditor(format = IS_BOLD | IS_ITALIC) {
  const editor = createEditor({
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('before match after').setFormat(format)
        )
      );
    },
    { discrete: true }
  );
  return editor;
}

function createMixedFormatEditor() {
  const editor = createEditor({
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('before hel').toggleFormat('bold'),
          $createTextNode('l').toggleFormat('italic'),
          $createTextNode('o after')
        )
      );
    },
    { discrete: true }
  );
  return editor;
}

describe('highlightMatch', () => {
  it('renders a visible highlight on inline code while preserving monospace formatting', () => {
    const editor = createEditor({
      onError: (error) => {
        throw error;
      },
    });
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('before match after').setFormat(IS_CODE)
          )
        );
      },
      { discrete: true }
    );

    highlightMatch(editor, performSearch(editor, 'match')[0]);

    editor.read(() => {
      const nodes = $getRoot().getAllTextNodes();
      const matched = nodes[1];
      expect(nodes.every((node) => node.hasFormat('code'))).toBe(true);
      expect(matched.getTextContent()).toBe('match');
      expect(matched.hasFormat('highlight')).toBe(true);
      const dom = matched.createDOM({
        namespace: 'test',
        theme: editorConfig.theme!,
      });
      expect(dom.tagName).toBe('CODE');
      expect(
        dom.matches('.text-highlight') ||
          dom.querySelector('.text-highlight') !== null
      ).toBe(true);
    });
  });

  it('highlights a match across three nodes without changing their formatting', () => {
    const editor = createMixedFormatEditor();
    const [match] = performSearch(editor, 'hello');

    const key = highlightMatch(editor, match);

    expect(key).not.toBeNull();
    editor.read(() => {
      expect(
        $getRoot()
          .getAllTextNodes()
          .map((node) => ({
            text: node.getTextContent(),
            bold: node.hasFormat('bold'),
            italic: node.hasFormat('italic'),
            highlight: node.hasFormat('highlight'),
          }))
      ).toEqual([
        { text: 'before ', bold: true, italic: false, highlight: false },
        { text: 'hel', bold: true, italic: false, highlight: true },
        { text: 'l', bold: false, italic: true, highlight: true },
        { text: 'o', bold: false, italic: false, highlight: true },
        { text: ' after', bold: false, italic: false, highlight: false },
      ]);
    });
  });

  it('splits the matched text and preserves bold and italic on every piece', () => {
    const editor = createFormattedEditor();
    const [match] = performSearch(editor, 'match');

    const key = highlightMatch(editor, match);

    expect(key).not.toBeNull();
    editor.read(() => {
      const nodes = $getRoot().getAllTextNodes();
      expect(
        nodes.map((node) => ({
          text: node.getTextContent(),
          bold: node.hasFormat('bold'),
          italic: node.hasFormat('italic'),
          highlight: node.hasFormat('highlight'),
        }))
      ).toEqual([
        { text: 'before ', bold: true, italic: true, highlight: false },
        { text: 'match', bold: true, italic: true, highlight: true },
        { text: ' after', bold: true, italic: true, highlight: false },
      ]);
      expect(key).toBe(nodes[1].getKey());
    });
  });
});

describe('clearHighlight', () => {
  it('clears every part of a cross-node match and restores the original text runs', () => {
    const editor = createMixedFormatEditor();
    const keyRef = {
      current: highlightMatch(editor, performSearch(editor, 'hello')[0]),
    };

    clearHighlight(editor, keyRef);

    expect(keyRef.current).toBeNull();
    editor.read(() => {
      expect(
        $getRoot()
          .getAllTextNodes()
          .map((node) => ({
            text: node.getTextContent(),
            format: node.getFormat(),
          }))
      ).toEqual([
        { text: 'before hel', format: IS_BOLD },
        { text: 'l', format: IS_ITALIC },
        { text: 'o after', format: 0 },
      ]);
    });
  });

  it.each([IS_BOLD | IS_ITALIC, IS_CODE])(
    'merges split pieces back while preserving format %i',
    (format) => {
      const editor = createFormattedEditor(format);
      const keyRef = {
        current: highlightMatch(editor, performSearch(editor, 'match')[0]),
      };

      clearHighlight(editor, keyRef);

      expect(keyRef.current).toBeNull();
      editor.read(() => {
        const nodes = $getRoot().getAllTextNodes();
        expect(nodes).toHaveLength(1);
        expect(nodes[0].getTextContent()).toBe('before match after');
        expect(nodes[0].getFormat()).toBe(format);
      });
    }
  );
});
