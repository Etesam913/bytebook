import type { TextMatchTransformer } from '@lexical/markdown';
import { $createFileNode, $isFileNode, FileNode } from '../nodes/file';
import {
  addQueryParam,
  escapeFileContentForMarkdown,
  getQueryParamValue,
  removeQueryParam,
  unescapeFileContentFromMarkdown,
} from '../../../utils/string-formatting';

const srcRegex = /\/notes\/([^/]+)\/([^/]+)\//;

/** Updates image src when location pathname changes, should revisit this */
function updateSrc(nodeSrc: string) {
  // If it is coming from file-server update url if the folder name or note title changes
  if (!nodeSrc.includes('localhost')) {
    return nodeSrc;
  }
  const urlSplit = location.pathname.split('/');
  const currentFolder = urlSplit.at(1);

  return nodeSrc.replace(srcRegex, `/notes/${currentFolder}/`);
}

export const FILE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [FileNode],
  export: (node) => {
    let filePathOrSrc = '';
    let altText = '';
    if (!$isFileNode(node)) {
      return null;
    }

    filePathOrSrc = updateSrc(node.getSrc());
    const { width, height } = node.getDimensions();
    altText = addQueryParam(node.getAltText(), 'width', String(width));
    if (height) {
      altText = addQueryParam(altText, 'height', String(height));
    }

    return `![${escapeFileContentForMarkdown(altText)}](${escapeFileContentForMarkdown(filePathOrSrc)}) `;
  },
  importRegExp: /!(?:\[((?:[^\]\\]|\\.)*)\])(?:\(((?:[^()\\]|\\.)+)\))/,
  regExp: /!(?:\[((?:[^\]\\]|\\.)*)\])(?:\(((?:[^()\\]|\\.)+)\))$/,
  replace: (textNode, match) => {
    const alt = match.at(1);
    const filePathOrSrc = match.at(2);
    if (!alt || !filePathOrSrc) {
      textNode.replace(textNode);
      return;
    }

    const widthQueryValue = getQueryParamValue(alt, 'width');
    const heightQueryValue = getQueryParamValue(alt, 'height');

    const width = widthQueryValue ? Number(widthQueryValue) : undefined;

    if (width === undefined) {
      textNode.replace(textNode);
      return;
    }

    const height = heightQueryValue ? Number(heightQueryValue) : undefined;

    // Remove query params from alt text to get the actual alt text
    let cleanAlt = removeQueryParam(alt, 'width');
    if (heightQueryValue) {
      cleanAlt = removeQueryParam(cleanAlt, 'height');
    }
    // Remove any remaining query string markers if alt only contained query params
    cleanAlt = cleanAlt.replace(/^\?+$/, '').trim();
    // Ensure we have a valid alt text (use empty string if it was only query params)
    // Also ensure it's a string (not undefined or null)
    const finalAlt = (cleanAlt || '').toString();

    const nodeToCreate = $createFileNode({
      alt: unescapeFileContentFromMarkdown(finalAlt),
      src: unescapeFileContentFromMarkdown(filePathOrSrc),
      dimensions: { width, height },
    });
    textNode.replace(nodeToCreate);
  },
  type: 'text-match',
  trigger: ')',
};
