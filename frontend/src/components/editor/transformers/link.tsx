import type { TextMatchTransformer } from '@lexical/markdown';
import { $createTextNode, $isTextNode } from 'lexical';
import {
  encodeLinkUrl,
  encodeLinkAltText,
  decodeLinkAltText,
  isInternalLink,
  unescapeUnderscore,
} from '../../../utils/string-formatting';
import { WAILS_URL } from '../../../utils/general';
import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  LinkNode,
} from '../nodes/link';

// Percent-encodes each path segment using the same rules as encodeLinkUrl so
// the Go backend can produce identical strings when doing link rewrites.
// Decodes first to normalize, since the LinkNode's URL may already be encoded
// (e.g. when created from an anchor element's href).
function encodeInternalPath(path: string): string {
  return path
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      let decoded = seg;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        // segment isn't valid percent-encoding; treat as raw
      }
      return encodeLinkUrl(decoded);
    })
    .join('/');
}

function decodeInternalPath(path: string): string {
  return path
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join('/');
}

export const LINK: TextMatchTransformer = {
  dependencies: [LinkNode],
  export: (node, _exportChildren, exportFormat) => {
    if (!$isLinkNode(node) || $isAutoLinkNode(node)) {
      return null;
    }
    const linkUrl = node.getURL();

    // Internal links: percent-encode each /notes/ path segment (CommonMark form)
    // External links: URL-encode as before
    const encodedLinkUrl = isInternalLink(linkUrl)
      ? encodeInternalPath(linkUrl.split(WAILS_URL)[1])
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

    // Internal links stored as percent-encoded /notes/ paths — decode per-segment
    // External links keep existing decoding behavior
    let url: string;
    if (filePathOrSrc.startsWith('/notes/')) {
      url = `${WAILS_URL}${decodeInternalPath(filePathOrSrc)}`;
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
