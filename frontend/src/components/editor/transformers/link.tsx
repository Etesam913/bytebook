import type { TextMatchTransformer } from '@lexical/markdown';
import { $createTextNode, $isTextNode } from 'lexical';
import {
  convertFilePathToQueryNotation,
  convertNoteNameToDotNotation,
  escapeFileContentForMarkdown,
  isInternalLink,
  unescapeFileContentFromMarkdown,
} from '../../../utils/string-formatting';
import { $createLinkNode, $isLinkNode, LinkNode } from '../nodes/link';

export const LINK: TextMatchTransformer = {
  dependencies: [LinkNode],
  export: (node, _, exportFormat) => {
    if (!$isLinkNode(node)) {
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

    const linkContent = `[${escapeFileContentForMarkdown(
      node.getTextContent()
    )}](${linkUrl})`;
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
    /(?:\[([^[]+)\])(?:\((?:([^()]+?)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
  replace: (textNode, match) => {
    const alt = match.at(1);
    const filePathOrSrc = match.at(2);
    if (!alt || !filePathOrSrc) {
      textNode.replace(textNode);
      return;
    }
    const [linkText, linkUrl, linkTitle] = [
      match.at(1),
      unescapeFileContentFromMarkdown(match.at(2) ?? ''),
      unescapeFileContentFromMarkdown(match.at(3) ?? ''),
    ];
    const linkNode = $createLinkNode(convertFilePathToQueryNotation(linkUrl), {
      title: linkTitle,
    });
    const linkTextNode = $createTextNode(linkText);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match',
};
