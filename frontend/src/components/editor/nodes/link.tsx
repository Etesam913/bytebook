import { LinkNode } from '@lexical/link';
import {
  createCommand,
  type EditorConfig,
  type LexicalCommand,
  type LexicalNodeReplacement,
} from 'lexical';
import { renderToStaticMarkup } from 'react-dom/server';
import { Note } from '@/icons/page';
import { isInternalLink } from '@components/editor/utils/markdown-links';

export const OPEN_LINK_EDITOR_COMMAND: LexicalCommand<void> = createCommand(
  'OPEN_LINK_EDITOR_COMMAND'
);

/**
 * Upstream LinkNode plus Bytebook's note links: `wails:` URLs pass
 * sanitization and render with a page icon. Registered through node
 * replacement so every upstream $createLinkNode call yields this class.
 */
export class BytebookLinkNode extends LinkNode {
  $config() {
    return this.config('bytebook-link', { extends: LinkNode });
  }

  sanitizeUrl(url: string): string {
    return isInternalLink(url) ? url : super.sanitizeUrl(url);
  }

  createDOM(config: EditorConfig) {
    const element = super.createDOM(config);
    if (isInternalLink(this.__url)) {
      element.classList.add(INTERNAL_LINK_CLASS);
      element.insertAdjacentHTML('afterbegin', renderToStaticMarkup(<Note />));
    }
    return element;
  }

  updateDOM(
    prevNode: this,
    anchor: HTMLAnchorElement | HTMLSpanElement,
    config: EditorConfig
  ): boolean {
    // Recreate the anchor when the URL changes so the icon follows it.
    return (
      super.updateDOM(prevNode, anchor, config) || prevNode.__url !== this.__url
    );
  }
}

const INTERNAL_LINK_CLASS = 'link-internal';

export const linkNodeReplacement: LexicalNodeReplacement = {
  replace: LinkNode,
  with: (node) => {
    const link = node as LinkNode;
    return new BytebookLinkNode(link.__url, {
      rel: link.__rel,
      target: link.__target,
      title: link.__title,
    });
  },
  withKlass: BytebookLinkNode,
};
