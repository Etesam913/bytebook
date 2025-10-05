import type { TextMatchTransformer } from '@lexical/markdown';
import { $createFileNode, $isFileNode, FileNode } from '../nodes/file';
import { type ResizeWidth } from '../../../types';
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
    altText = addQueryParam(
      node.getAltText(),
      'width',
      String(node.getWidth())
    );

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
    const width: ResizeWidth = widthQueryValue
      ? widthQueryValue.charAt(widthQueryValue.length - 1) === '%'
        ? '100%'
        : Number.parseInt(widthQueryValue)
      : '100%';

    const nodeToCreate = $createFileNode({
      alt: unescapeFileContentFromMarkdown(removeQueryParam(alt, 'width')),
      src: unescapeFileContentFromMarkdown(filePathOrSrc),
      width,
    });
    textNode.replace(nodeToCreate);
  },
  type: 'text-match',
  trigger: ')',
};
