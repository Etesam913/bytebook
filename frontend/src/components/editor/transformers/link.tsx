import type { TextMatchTransformer } from '@lexical/markdown';
import { $createTextNode, $isTextNode } from 'lexical';
import {
  convertNoteNameToDotNotation,
  escapeParenthesis,
  escapeSquareBrackets,
  isInternalLink,
  unescapeParenthesis,
  unescapeSquareBrackets,
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
    const title = node.getTitle();
    let linkUrl = node.getURL();

    if (isInternalLink(linkUrl)) {
      const urlSegments = linkUrl.split('/');
      const noteName = urlSegments[urlSegments.length - 1];
      linkUrl = [
        ...urlSegments.slice(0, -1),
        convertNoteNameToDotNotation(noteName),
      ].join('/');
    }

    // Escape special markdown characters in the URL
    linkUrl = escapeParenthesis(linkUrl);

    const textContent = escapeSquareBrackets(node.getTextContent());

    const linkContent = title
      ? `[${textContent}](${linkUrl} "${title}")`
      : `[${textContent}](${linkUrl})`;

    console.log({
      originalTextContent: node.getTextContent(),
      textContent,
      linkUrl,
    });

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
    let alt = match.at(1);
    let filePathOrSrc = match.at(2);
    let linkTitle = match.at(3);
    if (!alt || !filePathOrSrc) {
      textNode.replace(textNode);
      return;
    }
    alt = unescapeSquareBrackets(alt);
    // Unescape special markdown characters in the URL
    filePathOrSrc = unescapeUnderscore(unescapeParenthesis(filePathOrSrc));
    linkTitle = linkTitle ? unescapeSquareBrackets(linkTitle) : undefined;

    // const linkNode = $createLinkNode(convertFilePathToQueryNotation(linkUrl), {
    //   title: linkTitle,
    // });

    console.log({
      alt,
      filePathOrSrc,
      linkTitle,
    });

    const linkNode = $createLinkNode(filePathOrSrc);
    const linkTextNode = $createTextNode(alt);
    linkTextNode.setFormat(textNode.getFormat());
    linkNode.append(linkTextNode);
    textNode.replace(linkNode);
  },
  trigger: ')',
  type: 'text-match',
};
