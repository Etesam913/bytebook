import type { TextMatchTransformer } from '@lexical/markdown';
import { $createTextNode, $isTextNode } from 'lexical';
import {
  encodeLinkUrl,
  encodeLinkAltText,
  decodeLinkAltText,
  escapeFileContentForMarkdown,
  isInternalLink,
  unescapeFileContentFromMarkdown,
  unescapeUnderscore,
} from '../../../utils/string-formatting';
import { WAILS_URL } from '../../../utils/general';
import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  LinkNode,
} from '../nodes/link';

export const LINK: TextMatchTransformer = {
  dependencies: [LinkNode],
  export: (node, _exportChildren, exportFormat) => {
    if (!$isLinkNode(node) || $isAutoLinkNode(node)) {
      return null;
    }
    const linkUrl = node.getURL();

    // Internal links: use clean /notes/ path
    // External links: URL-encode as before
    const encodedLinkUrl = isInternalLink(linkUrl)
      ? escapeFileContentForMarkdown(linkUrl.split(WAILS_URL)[1])
      : encodeLinkUrl(linkUrl);

    // Escape special markdown characters in the URL
    const altText = encodeLinkAltText(node.getTextContent());
    const linkContent = `[${altText}](${encodedLinkUrl})`;

    const firstChild = node.getFirstChild();
    // Add text styles only if link has single text node inside. If it's more
    // than one we ignore it as markdown does not support nested styles for links
    if (node.getChildrenSize() === 1) {
      if ($isTextNode(firstChild)) {
        return exportFormat(firstChild, linkContent);
      }
    }
    return linkContent;
  },
  importRegExp:
    /(?:\[([^[]+)\])(?:\((?:((?:[^()\\]|\\.)+?)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
  regExp:
    /(?:\[([^[]+)\])(?:\((?:((?:\\.|[^()])+?)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    let alt = match.at(1);
    const filePathOrSrc = match.at(2);

    if (!alt || !filePathOrSrc) {
      textNode.replace(textNode);
      return;
    }
    alt = decodeLinkAltText(alt);

    // Internal links stored as clean /notes/ paths — prepend wails: for LinkNode
    // External links keep existing decoding behavior
    let url: string;
    if (filePathOrSrc.startsWith('/notes/')) {
      url = `${WAILS_URL}${unescapeFileContentFromMarkdown(filePathOrSrc)}`;
    } else {
      url = unescapeUnderscore(decodeURIComponent(filePathOrSrc));
    }

    const linkNode = $createLinkNode(url);
    const linkTextNode = $createTextNode(alt);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match',
};
