import { $isAutoLinkNode, $isLinkNode } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent } from '@lexical/utils';
import { $getNearestNodeFromDOMNode, isDOMNode } from 'lexical';
import { useEffect } from 'react';
import { navigate } from 'wouter/use-browser-location';
import { WAILS_URL } from '@utils/general';
import { openLinkInBrowser } from '../utils/link';
import { isInternalLink } from '@components/editor/utils/markdown-links';

/**
 * Routes clicks on links: note links navigate in-app, everything else opens
 * in the system browser. One root listener covers LinkNode and AutoLinkNode.
 */
export function LinkClickPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!isDOMNode(target)) return;
      const url = editor.read(() => {
        const node = $getNearestNodeFromDOMNode(target);
        const link = node && $findMatchingParent(node, $isLinkNode);
        if (!link || ($isAutoLinkNode(link) && link.getIsUnlinked())) {
          return null;
        }
        return link.getURL();
      });
      if (!url) return;
      event.preventDefault();
      if (isInternalLink(url)) {
        navigate(url.split(WAILS_URL)[1]);
      } else {
        openLinkInBrowser(url);
      }
    };

    return editor.registerRootListener((root, prevRoot) => {
      prevRoot?.removeEventListener('click', onClick);
      root?.addEventListener('click', onClick);
    });
  }, [editor]);

  return null;
}
