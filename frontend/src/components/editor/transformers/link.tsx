import type { TextMatchTransformer } from '@lexical/markdown';
import { $createTextNode, $isTextNode } from 'lexical';
import {
  convertNoteNameToDotNotation,
  encodeLinkUrl,
  encodeLinkAltText,
  decodeLinkAltText,
  isInternalLink,
  unescapeUnderscore,
} from '../../../utils/string-formatting';
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
    let linkUrl = node.getURL();

    if (isInternalLink(linkUrl)) {
      const urlSegments = linkUrl.split('/');
      const noteName = urlSegments[urlSegments.length - 1];
      linkUrl = [
        ...urlSegments.slice(0, -1),
        convertNoteNameToDotNotation(noteName),
      ].join('/');
    }

    const encodedLinkUrl = encodeLinkUrl(linkUrl);

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
    /(?:\[([^[]+)\])(?:\((?:([^()]+?)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
  regExp:
    /(?:\[([^[]+)\])(?:\((?:((?:\\.|[^()])+?)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    let alt = match.at(1);
    let filePathOrSrc = match.at(2);

    if (!alt || !filePathOrSrc) {
      textNode.replace(textNode);
      return;
    }
    alt = decodeLinkAltText(alt);

    // Unescape special markdown characters in the URL
    filePathOrSrc = unescapeUnderscore(decodeURIComponent(filePathOrSrc));

    const linkNode = $createLinkNode(filePathOrSrc);
    const linkTextNode = $createTextNode(alt);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match',
};
