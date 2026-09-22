import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import {
  $createLinkNode,
  $isLinkNode,
  AutoLinkNode,
  LinkNode,
} from '@lexical/link';
import { createEditor, type LexicalEditor } from 'lexical';
import { BytebookLinkNode, linkNodeReplacement } from './link';

function createTestEditor(): LexicalEditor {
  return createEditor({
    namespace: 'link-test',
    nodes: [LinkNode, AutoLinkNode, BytebookLinkNode, linkNodeReplacement],
    onError: (error) => {
      throw error;
    },
  });
}

function renderLink(editor: LexicalEditor, url: string) {
  let dom: HTMLElement | null = null;
  editor.update(
    () => {
      dom = $createLinkNode(url).createDOM(editor._config);
    },
    { discrete: true }
  );
  return dom!;
}

describe('BytebookLinkNode', () => {
  it('replaces every LinkNode created through the upstream factory', () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const link = $createLinkNode('https://example.com');
        expect(link).toBeInstanceOf(BytebookLinkNode);
        expect($isLinkNode(link)).toBe(true);
      },
      { discrete: true }
    );
  });

  it('keeps note links intact and renders them with a page icon', () => {
    const dom = renderLink(createTestEditor(), 'wails:/notes/Folder/Note.md');
    expect(dom.getAttribute('href')).toBe('wails:/notes/Folder/Note.md');
    expect(dom.classList.contains('link-internal')).toBe(true);
    expect(dom.querySelector('svg')).not.toBeNull();
  });

  it('sanitizes external links like upstream and skips the icon', () => {
    const editor = createTestEditor();
    expect(renderLink(editor, 'javascript:alert(1)').getAttribute('href')).toBe(
      'about:blank'
    );
    const external = renderLink(editor, 'https://example.com/docs');
    expect(external.getAttribute('href')).toBe('https://example.com/docs');
    expect(external.classList.contains('link-internal')).toBe(false);
    expect(external.querySelector('svg')).toBeNull();
  });
});
