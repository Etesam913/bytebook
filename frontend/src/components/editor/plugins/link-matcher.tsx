import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $createTextNode,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  type ElementNode,
  type LexicalNode,
  TextNode,
} from 'lexical';
import { useEffect } from 'react';
import {
  $createAutoLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
  TOGGLE_LINK_COMMAND,
} from '../nodes/link';

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const MATCHERS = [
  (text: string) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
      // attributes: { rel: 'noreferrer', target: '_blank' }, // Optional link attributes
    };
  },
];

type ChangeHandler = (url: string | null, prevUrl: string | null) => void;

export type AutoLinkAttributes = {
  rel?: null | string;
  target?: null | string;
  title?: null | string;
  isUnlinked?: boolean;
};

type LinkMatcherResult = {
  attributes?: AutoLinkAttributes;
  index: number;
  length: number;
  text: string;
  url: string;
};

export type LinkMatcher = (text: string) => LinkMatcherResult | null;

export function createLinkMatcherWithRegExp(
  regExp: RegExp,
  urlTransformer: (text: string) => string = (text) => text
) {
  return (text: string) => {
    const match = regExp.exec(text);
    if (match === null) {
      return null;
    }
    return {
      index: match.index,
      length: match[0].length,
      text: match[0],
      url: urlTransformer(match[0]),
    };
  };
}

function findFirstMatch(
  text: string,
  matchers: Array<LinkMatcher>
): LinkMatcherResult | null {
  for (let i = 0; i < matchers.length; i++) {
    const match = matchers[i](text);

    if (match) {
      return match;
    }
  }

  return null;
}

const PUNCTUATION_OR_SPACE = /[.,;\s]/;

function isSeparator(char: string): boolean {
  return PUNCTUATION_OR_SPACE.test(char);
}

function endsWithSeparator(textContent: string): boolean {
  return isSeparator(textContent[textContent.length - 1]);
}

function startsWithSeparator(textContent: string): boolean {
  return isSeparator(textContent[0]);
}

/**
 * Check if the text content starts with a fullstop followed by a top-level domain.
 * Meaning if the text content can be a beginning of a top level domain.
 * @param textContent
 * @param isEmail
 * @returns boolean
 */
function startsWithTLD(textContent: string, isEmail: boolean): boolean {
  if (isEmail) {
    return /^\.[a-zA-Z]{2,}/.test(textContent);
  }
  return /^\.[a-zA-Z0-9]{1,}/.test(textContent);
}

function isPreviousNodeValid(node: LexicalNode): boolean {
  let previousNode = node.getPreviousSibling();
  if ($isElementNode(previousNode)) {
    previousNode = previousNode.getLastDescendant();
  }
  return (
    previousNode === null ||
    $isLineBreakNode(previousNode) ||
    ($isTextNode(previousNode) &&
      endsWithSeparator(previousNode.getTextContent()))
  );
}

function isNextNodeValid(node: LexicalNode): boolean {
  let nextNode = node.getNextSibling();
  if ($isElementNode(nextNode)) {
    nextNode = nextNode.getFirstDescendant();
  }
  return (
    nextNode === null ||
    $isLineBreakNode(nextNode) ||
    ($isTextNode(nextNode) && startsWithSeparator(nextNode.getTextContent()))
  );
}

function isContentAroundIsValid(
  matchStart: number,
  matchEnd: number,
  text: string,
  nodes: TextNode[]
): boolean {
  const contentBeforeIsValid =
    matchStart > 0
      ? isSeparator(text[matchStart - 1])
      : isPreviousNodeValid(nodes[0]);
  if (!contentBeforeIsValid) {
    return false;
  }

  const contentAfterIsValid =
    matchEnd < text.length
      ? isSeparator(text[matchEnd])
      : isNextNodeValid(nodes[nodes.length - 1]);
  return contentAfterIsValid;
}

function extractMatchingNodes(
  nodes: TextNode[],
  startIndex: number,
  endIndex: number
): [
  matchingOffset: number,
  unmodifiedBeforeNodes: TextNode[],
  matchingNodes: TextNode[],
  unmodifiedAfterNodes: TextNode[],
] {
  const unmodifiedBeforeNodes: TextNode[] = [];
  const matchingNodes: TextNode[] = [];
  const unmodifiedAfterNodes: TextNode[] = [];
  let matchingOffset = 0;

  let currentOffset = 0;
  const currentNodes = [...nodes];

  while (currentNodes.length > 0) {
    const currentNode = currentNodes[0];
    const currentNodeText = currentNode.getTextContent();
    const currentNodeLength = currentNodeText.length;
    const currentNodeStart = currentOffset;
    const currentNodeEnd = currentOffset + currentNodeLength;

    if (currentNodeEnd <= startIndex) {
      unmodifiedBeforeNodes.push(currentNode);
      matchingOffset += currentNodeLength;
    } else if (currentNodeStart >= endIndex) {
      unmodifiedAfterNodes.push(currentNode);
    } else {
      matchingNodes.push(currentNode);
    }
    currentOffset += currentNodeLength;
    currentNodes.shift();
  }
  return [
    matchingOffset,
    unmodifiedBeforeNodes,
    matchingNodes,
    unmodifiedAfterNodes,
  ];
}

function $createAutoLinkNode_(
  nodes: TextNode[],
  startIndex: number,
  endIndex: number,
  match: LinkMatcherResult
): TextNode | undefined {
  const linkNode = $createAutoLinkNode(match.url, match.attributes);
  if (nodes.length === 1) {
    let remainingTextNode = nodes[0];
    // biome-ignore lint/suspicious/noImplicitAnyLet: This declaration is okay as this is copied from Meta, so I trust them
    let linkTextNode: null | TextNode = null;
    if (startIndex === 0) {
      [linkTextNode, remainingTextNode] = remainingTextNode.splitText(endIndex);
    } else {
      [, linkTextNode, remainingTextNode] = remainingTextNode.splitText(
        startIndex,
        endIndex
      );
    }
    const textNode = $createTextNode(match.text);
    textNode.setFormat(linkTextNode.getFormat());
    textNode.setDetail(linkTextNode.getDetail());
    textNode.setStyle(linkTextNode.getStyle());
    linkNode.append(textNode);
    linkTextNode.replace(linkNode);
    return remainingTextNode;
  }
  if (nodes.length > 1) {
    const firstTextNode = nodes[0];
    let offset = firstTextNode.getTextContent().length;
    let firstLinkTextNode: TextNode | null = null;
    if (startIndex === 0) {
      firstLinkTextNode = firstTextNode;
    } else {
      [, firstLinkTextNode] = firstTextNode.splitText(startIndex);
    }
    const linkNodes: TextNode[] = [];
    // biome-ignore lint/suspicious/noImplicitAnyLet: This declaration is okay as this is copied from Meta, so I trust them
    let remainingTextNode: TextNode | null = null;
    for (let i = 1; i < nodes.length; i++) {
      const currentNode = nodes[i];
      const currentNodeText = currentNode.getTextContent();
      const currentNodeLength = currentNodeText.length;
      const currentNodeStart = offset;
      const currentNodeEnd = offset + currentNodeLength;
      if (currentNodeStart < endIndex) {
        if (currentNodeEnd <= endIndex) {
          linkNodes.push(currentNode);
        } else {
          const [linkTextNode, endNode] = currentNode.splitText(
            endIndex - currentNodeStart
          );
          linkNodes.push(linkTextNode);
          remainingTextNode = endNode;
        }
      }
      offset += currentNodeLength;
    }
    const selection = $getSelection();
    const selectedTextNode = selection
      ? selection.getNodes().find($isTextNode)
      : undefined;
    const textNode = $createTextNode(firstLinkTextNode.getTextContent());
    textNode.setFormat(firstLinkTextNode.getFormat());
    textNode.setDetail(firstLinkTextNode.getDetail());
    textNode.setStyle(firstLinkTextNode.getStyle());
    linkNode.append(textNode, ...linkNodes);
    // it does not preserve caret position if caret was at the first text node
    // so we need to restore caret position
    if (selectedTextNode && selectedTextNode === firstLinkTextNode) {
      if ($isRangeSelection(selection)) {
        textNode.select(selection.anchor.offset, selection.focus.offset);
      } else if ($isNodeSelection(selection)) {
        textNode.select(0, textNode.getTextContent().length);
      }
    }
    firstLinkTextNode.replace(linkNode);
    return remainingTextNode ?? undefined;
  }
  return undefined;
}

function $handleLinkCreation(
  nodes: TextNode[],
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler
): void {
  let currentNodes = [...nodes];
  const initialText = currentNodes
    .map((node) => node.getTextContent())
    .join('');
  let text = initialText;
  // biome-ignore lint/suspicious/noImplicitAnyLet: This declaration is okay as this is copied from Meta, so I trust them
  let match;
  let invalidMatchEnd = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((match = findFirstMatch(text, matchers)) && match !== null) {
    const matchStart = match.index;
    const matchLength = match.length;
    const matchEnd = matchStart + matchLength;
    const isValid = isContentAroundIsValid(
      invalidMatchEnd + matchStart,
      invalidMatchEnd + matchEnd,
      initialText,
      currentNodes
    );

    if (isValid) {
      const [matchingOffset, , matchingNodes, unmodifiedAfterNodes] =
        extractMatchingNodes(
          currentNodes,
          invalidMatchEnd + matchStart,
          invalidMatchEnd + matchEnd
        );

      const actualMatchStart = invalidMatchEnd + matchStart - matchingOffset;
      const actualMatchEnd = invalidMatchEnd + matchEnd - matchingOffset;
      const remainingTextNode = $createAutoLinkNode_(
        matchingNodes,
        actualMatchStart,
        actualMatchEnd,
        match
      );
      currentNodes = remainingTextNode
        ? [remainingTextNode, ...unmodifiedAfterNodes]
        : unmodifiedAfterNodes;
      onChange(match.url, null);
      invalidMatchEnd = 0;
    } else {
      invalidMatchEnd += matchEnd;
    }

    text = text.substring(matchEnd);
  }
}

function handleLinkEdit(
  linkNode: AutoLinkNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler
): void {
  // Check children are simple text
  const children = linkNode.getChildren();
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const child = children[i];
    if (!$isTextNode(child) || !child.isSimpleText()) {
      replaceWithChildren(linkNode);
      onChange(null, linkNode.getURL());
      return;
    }
  }

  // Check text content fully matches
  const text = linkNode.getTextContent();
  const match = findFirstMatch(text, matchers);
  if (match === null || match.text !== text) {
    replaceWithChildren(linkNode);
    onChange(null, linkNode.getURL());
    return;
  }

  // Check neighbors
  if (!isPreviousNodeValid(linkNode) || !isNextNodeValid(linkNode)) {
    replaceWithChildren(linkNode);
    onChange(null, linkNode.getURL());
    return;
  }

  const url = linkNode.getURL();
  if (url !== match.url) {
    linkNode.setURL(match.url);
    onChange(match.url, url);
  }

  if (match.attributes) {
    const rel = linkNode.getRel();
    if (rel !== match.attributes.rel) {
      linkNode.setRel(match.attributes.rel || null);
      onChange(match.attributes.rel || null, rel);
    }

    const target = linkNode.getTarget();
    if (target !== match.attributes.target) {
      linkNode.setTarget(match.attributes.target || null);
      onChange(match.attributes.target || null, target);
    }
  }
}

// Bad neighbors are edits in neighbor nodes that make AutoLinks incompatible.
// Given the creation preconditions, these can only be simple text nodes.
function handleBadNeighbors(
  textNode: TextNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler
): void {
  const previousSibling = textNode.getPreviousSibling();
  const nextSibling = textNode.getNextSibling();
  const text = textNode.getTextContent();

  if (
    $isAutoLinkNode(previousSibling) &&
    !previousSibling.getIsUnlinked() &&
    (!startsWithSeparator(text) ||
      startsWithTLD(text, previousSibling.isEmailURI()))
  ) {
    previousSibling.append(textNode);
    handleLinkEdit(previousSibling, matchers, onChange);
    onChange(null, previousSibling.getURL());
  }

  if (
    $isAutoLinkNode(nextSibling) &&
    !nextSibling.getIsUnlinked() &&
    !endsWithSeparator(text)
  ) {
    replaceWithChildren(nextSibling);
    handleLinkEdit(nextSibling, matchers, onChange);
    onChange(null, nextSibling.getURL());
  }
}

function replaceWithChildren(node: ElementNode): Array<LexicalNode> {
  const children = node.getChildren();
  const childrenLength = children.length;

  for (let j = childrenLength - 1; j >= 0; j--) {
    node.insertAfter(children[j]);
  }

  node.remove();
  return children.map((child) => child.getLatest());
}

function getTextNodesToMatch(textNode: TextNode): TextNode[] {
  // check if next siblings are simple text nodes till a node contains a space separator
  const textNodesToMatch = [textNode];
  let nextSibling = textNode.getNextSibling();
  while (
    nextSibling !== null &&
    $isTextNode(nextSibling) &&
    nextSibling.isSimpleText()
  ) {
    textNodesToMatch.push(nextSibling);
    if (/[\s]/.test(nextSibling.getTextContent())) {
      break;
    }
    nextSibling = nextSibling.getNextSibling();
  }
  return textNodesToMatch;
}

export function LinkMatcherPlugin({ onChange }: { onChange?: ChangeHandler }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([AutoLinkNode])) {
      throw new Error(
        'LexicalAutoLinkPlugin: AutoLinkNode not registered on editor'
      );
    }

    const onChangeWrapped = (url: string | null, prevUrl: string | null) => {
      if (onChange) {
        onChange(url, prevUrl);
      }
    };

    return mergeRegister(
      editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
        const parent = textNode.getParentOrThrow();
        const previous = textNode.getPreviousSibling();
        if ($isAutoLinkNode(parent) && !parent.getIsUnlinked()) {
          handleLinkEdit(parent, MATCHERS, onChangeWrapped);
        } else if (!$isLinkNode(parent)) {
          if (
            textNode.isSimpleText() &&
            (startsWithSeparator(textNode.getTextContent()) ||
              !$isAutoLinkNode(previous))
          ) {
            const textNodesToMatch = getTextNodesToMatch(textNode);
            $handleLinkCreation(textNodesToMatch, MATCHERS, onChangeWrapped);
          }

          handleBadNeighbors(textNode, MATCHERS, onChangeWrapped);
        }
      }),
      editor.registerCommand(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          const selection = $getSelection();
          if (payload !== null || !$isRangeSelection(selection)) {
            return false;
          }
          const nodes = selection.extract();
          nodes.forEach((node) => {
            const parent = node.getParent();

            if ($isAutoLinkNode(parent)) {
              // invert the value
              parent.setIsUnlinked(!parent.getIsUnlinked());
              parent.markDirty();
              return true;
            }
          });
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, MATCHERS, onChange]);

  return <></>;
}
