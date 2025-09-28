/** @module @lexical/link */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { addClassNamesToElement, isHTMLAnchorElement } from '@lexical/utils';
import type {
  BaseSelection,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalCommand,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
} from 'lexical';
import {
  $applyNodeReplacement,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  ElementNode,
  type Spread,
  createCommand,
} from 'lexical';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { navigate } from 'wouter/use-browser-location';
import { Folder } from '../../../icons/folder';
import { Note } from '../../../icons/page';
import {
  encodeNoteNameWithQueryParams,
  extractInfoFromNoteName,
  getInternalLinkType,
  isInternalLink,
} from '../../../utils/string-formatting';
import type { AutoLinkAttributes } from '../plugins/link-matcher';
import { handleATagClick, sanitizeUrl } from '../utils/link';

export type LinkAttributes = {
  rel?: null | string;
  target?: null | string;
  title?: null | string;
};

export type SerializedLinkNode = Spread<
  {
    url: string;
  },
  Spread<LinkAttributes, SerializedElementNode>
>;

/** @noInheritDoc */
export class LinkNode extends ElementNode {
  /** @internal */
  __url: string;
  /** @internal */
  __target: null | string;
  /** @internal */
  __rel: null | string;
  /** @internal */
  __title: null | string;

  static getType(): string {
    return 'link';
  }

  static clone(node: LinkNode): LinkNode {
    return new LinkNode(
      node.__url,
      { rel: node.__rel, target: node.__target, title: node.__title },
      node.__key
    );
  }

  constructor(url: string, attributes: LinkAttributes = {}, key?: NodeKey) {
    super(key);
    const { target = null, rel = null, title = null } = attributes;
    this.__url = url;
    this.__target = target;
    this.__rel = rel;
    this.__title = title;
  }

  createDOM(config: EditorConfig): HTMLAnchorElement {
    const element = document.createElement('a');
    element.href = sanitizeUrl(this.__url);
    if (this.__target !== null) {
      element.target = this.__target;
    }
    if (this.__rel !== null) {
      element.rel = this.__rel;
    }
    if (this.__title !== null) {
      element.title = this.__title;
    }

    const classNames = [config.theme.link];

    // This is an internal link so we want it to look different
    if (isInternalLink(element.href)) {
      classNames.pop();
      classNames.push(config.theme.internalLink);
      const segments = element.href.split('/');
      if (segments.length < 2) {
        throw new Error('Invalid link');
      }
      // Makes sure that the content before ?ext= is encoded
      const noteName = encodeNoteNameWithQueryParams(
        segments[segments.length - 1]
      );
      const { noteNameWithoutExtension, queryParams } =
        extractInfoFromNoteName(noteName);
      const extension = queryParams.ext;
      const folder = encodeURIComponent(segments[segments.length - 2]);

      const { isNoteLink, isFolderLink } = getInternalLinkType(element.href);
      const tempContainer = document.createElement('div');

      const folderSvg = (
        <Folder strokeWidth={2} className="mr-0.5 translate-y-1" />
      );
      const noteSvg = <Note className="translate-y-1" />;

      // Choose which icon to render
      const content = isFolderLink ? folderSvg : noteSvg;

      // Create a React root for the temporary container.
      const root = createRoot(tempContainer);
      // Use flushSync to force the update to complete synchronously.
      flushSync(() => {
        root.render(content);
      });

      // Now that the content is rendered, move it into the anchor element.
      while (tempContainer.firstChild) {
        element.appendChild(tempContainer.firstChild);
      }

      // Attach the click handler for internal navigation.
      element.onclick = (e) => {
        // The segments are encoded by default
        if (isNoteLink) {
          navigate(
            `/notes/${folder}/${noteNameWithoutExtension}?ext=${extension}`
          );
          e.preventDefault();
        } else if (isFolderLink) {
          const folder = segments[segments.length - 1];
          navigate(`/notes/${encodeURIComponent(folder)}`);
          e.preventDefault();
        } else {
          element.href = 'about:blank';
        }
      };
    }
    // For a regular link, let the browser handle it.
    else {
      element.onclick = (e) => {
        handleATagClick(e.target as HTMLElement);
      };
    }

    addClassNamesToElement(element, ...classNames);
    return element;
  }

  updateDOM(prevNode: LinkNode, anchor: HTMLAnchorElement): boolean {
    const url = this.__url;
    const target = this.__target;
    const rel = this.__rel;
    const title = this.__title;
    if (url !== prevNode.__url) {
      anchor.href = url;
    }

    if (target !== prevNode.__target) {
      if (target) {
        anchor.target = target;
      } else {
        anchor.removeAttribute('target');
      }
    }

    if (rel !== prevNode.__rel) {
      if (rel) {
        anchor.rel = rel;
      } else {
        anchor.removeAttribute('rel');
      }
    }

    if (title !== prevNode.__title) {
      if (title) {
        anchor.title = title;
      } else {
        anchor.removeAttribute('title');
      }
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      a: () => ({
        conversion: convertAnchorElement,
        priority: 1,
      }),
    };
  }

  static importJSON(
    serializedNode: SerializedLinkNode | SerializedAutoLinkNode
  ): LinkNode {
    const node = $createLinkNode(serializedNode.url, {
      rel: serializedNode.rel,
      target: serializedNode.target,
      title: serializedNode.title,
    });
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedLinkNode | SerializedAutoLinkNode {
    return {
      ...super.exportJSON(),
      rel: this.getRel(),
      target: this.getTarget(),
      title: this.getTitle(),
      type: 'link',
      url: this.getURL(),
      version: 1,
    };
  }

  getURL(): string {
    return this.getLatest().__url;
  }

  setURL(url: string): void {
    const writable = this.getWritable();
    writable.__url = url;
  }

  getTarget(): null | string {
    return this.getLatest().__target;
  }

  setTarget(target: null | string): void {
    const writable = this.getWritable();
    writable.__target = target;
  }

  getRel(): null | string {
    return this.getLatest().__rel;
  }

  setRel(rel: null | string): void {
    const writable = this.getWritable();
    writable.__rel = rel;
  }

  getTitle(): null | string {
    return this.getLatest().__title;
  }

  setTitle(title: null | string): void {
    const writable = this.getWritable();
    writable.__title = title;
  }

  insertNewAfter(
    _: RangeSelection,
    restoreSelection = true
  ): null | ElementNode {
    const linkNode = $createLinkNode(this.__url, {
      rel: this.__rel,
      target: this.__target,
      title: this.__title,
    });
    this.insertAfter(linkNode, restoreSelection);
    return linkNode;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  extractWithChild(_child: LexicalNode, selection: BaseSelection): boolean {
    if (!$isRangeSelection(selection)) {
      return false;
    }

    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();

    return (
      this.isParentOf(anchorNode) &&
      this.isParentOf(focusNode) &&
      selection.getTextContent().length > 0
    );
  }

  isEmailURI(): boolean {
    return this.__url.startsWith('mailto:');
  }

  isWebSiteURI(): boolean {
    return (
      this.__url.startsWith('https://') || this.__url.startsWith('http://')
    );
  }
}

function convertAnchorElement(domNode: Node): DOMConversionOutput {
  let node: LinkNode | null = null;
  if (isHTMLAnchorElement(domNode)) {
    const content = domNode.textContent;
    if ((content !== null && content !== '') || domNode.children.length > 0) {
      node = $createLinkNode(domNode.getAttribute('href') || '', {
        rel: domNode.getAttribute('rel'),
        target: domNode.getAttribute('target'),
        title: domNode.getAttribute('title'),
      });
    }
  }
  return { node };
}

/**
 * Takes a URL and creates a LinkNode.
 * @param url - The URL the LinkNode should direct to.
 * @param attributes - Optional HTML a tag attributes { target, rel, title }
 * @returns The LinkNode.
 */
export function $createLinkNode(
  url: string,
  attributes?: LinkAttributes
): LinkNode {
  return $applyNodeReplacement(new LinkNode(url, attributes));
}

/**
 * Determines if node is a LinkNode.
 * @param node - The node to be checked.
 * @returns true if node is a LinkNode, false otherwise.
 */
export function $isLinkNode(
  node: LexicalNode | null | undefined
): node is LinkNode {
  return node instanceof LinkNode;
}

export type SerializedAutoLinkNode = SerializedLinkNode;

// Custom node type to override `canInsertTextAfter` that will
// allow typing within the link
export class AutoLinkNode extends LinkNode {
  /** @internal */
  /** Indicates whether the autolink was ever unlinked. **/
  __isUnlinked: boolean;

  constructor(url: string, attributes: AutoLinkAttributes = {}, key?: NodeKey) {
    super(url, attributes, key);
    this.__isUnlinked =
      attributes.isUnlinked !== undefined && attributes.isUnlinked !== null
        ? attributes.isUnlinked
        : false;
  }

  static getType(): string {
    return 'autolink';
  }

  static clone(node: AutoLinkNode): AutoLinkNode {
    return new AutoLinkNode(
      node.__url,
      {
        isUnlinked: node.__isUnlinked,
        rel: node.__rel,
        target: node.__target,
        title: node.__title,
      },
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedAutoLinkNode): AutoLinkNode {
    const node = $createAutoLinkNode(serializedNode.url, {
      rel: serializedNode.rel,
      target: serializedNode.target,
      title: serializedNode.title,
    });
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  getIsUnlinked(): boolean {
    return this.__isUnlinked;
  }

  setIsUnlinked(value: boolean) {
    const self = this.getWritable();
    self.__isUnlinked = value;
    return self;
  }

  static importDOM(): null {
    // TODO: Should link node should handle the import over autolink?
    return null;
  }

  exportJSON(): SerializedAutoLinkNode {
    return {
      ...super.exportJSON(),
      type: 'autolink',
      version: 1,
    };
  }

  insertNewAfter(
    selection: RangeSelection,
    restoreSelection = true
  ): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(
      selection,
      restoreSelection
    );
    if ($isElementNode(element)) {
      const linkNode = $createAutoLinkNode(this.__url, {
        rel: this.__rel,
        target: this.__target,
        title: this.__title,
      });
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }
}

/**
 * Takes a URL and creates an AutoLinkNode. AutoLinkNodes are generally automatically generated
 * during typing, which is especially useful when a button to generate a LinkNode is not practical.
 * @param url - The URL the LinkNode should direct to.
 * @param attributes - Optional HTML a tag attributes. { target, rel, title }
 * @returns The LinkNode.
 */
export function $createAutoLinkNode(
  url: string,
  attributes?: LinkAttributes
): AutoLinkNode {
  return $applyNodeReplacement(new AutoLinkNode(url, attributes));
}

/**
 * Determines if node is an AutoLinkNode.
 * @param node - The node to be checked.
 * @returns true if node is an AutoLinkNode, false otherwise.
 */
export function $isAutoLinkNode(
  node: LexicalNode | null | undefined
): node is AutoLinkNode {
  return node instanceof AutoLinkNode;
}

export const TOGGLE_LINK_COMMAND: LexicalCommand<
  string | ({ url: string | null } & LinkAttributes) | null
> = createCommand('TOGGLE_LINK_COMMAND');

/**
 * Generates or updates a LinkNode. It can also delete a LinkNode if the URL is null,
 * but saves any children and brings them up to the parent node.
 * @param url - The URL the link directs to.
 * @param attributes - Optional HTML a tag attributes. { target, rel, title }
 */
export function toggleLink(
  url: null | string,
  attributes: LinkAttributes = {}
): void {
  const { target, title } = attributes;
  const rel = attributes.rel === undefined ? 'noreferrer' : attributes.rel;
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return;
  }
  const nodes = selection.extract();

  if (url === null) {
    // Remove LinkNodes
    nodes.forEach((node) => {
      const parent = node.getParent();

      if ($isLinkNode(parent)) {
        const children = parent.getChildren();

        for (let i = 0; i < children.length; i++) {
          parent.insertBefore(children[i]);
        }

        parent.remove();
      }
    });
  } else {
    // Add or merge LinkNodes
    if (nodes.length === 1) {
      const firstNode = nodes[0];
      // if the first node is a LinkNode or if its
      // parent is a LinkNode, we update the URL, target and rel.
      const linkNode = $getAncestor(firstNode, $isLinkNode);
      if (linkNode !== null) {
        linkNode.setURL(url);
        if (target !== undefined) {
          linkNode.setTarget(target);
        }
        if (rel !== null) {
          linkNode.setRel(rel);
        }
        if (title !== undefined) {
          linkNode.setTitle(title);
        }
        return;
      }
    }

    let prevParent: ElementNode | LinkNode | null = null;
    let linkNode: LinkNode | null = null;

    nodes.forEach((node) => {
      const parent = node.getParent();

      if (
        parent === linkNode ||
        parent === null ||
        ($isElementNode(node) && !node.isInline())
      ) {
        return;
      }

      if ($isLinkNode(parent)) {
        linkNode = parent;
        parent.setURL(url);
        if (target !== undefined) {
          parent.setTarget(target);
        }
        if (rel !== null) {
          linkNode.setRel(rel);
        }
        if (title !== undefined) {
          linkNode.setTitle(title);
        }
        return;
      }

      if (!parent.is(prevParent)) {
        prevParent = parent;
        linkNode = $createLinkNode(url, { rel, target, title });

        if ($isLinkNode(parent)) {
          if (node.getPreviousSibling() === null) {
            parent.insertBefore(linkNode);
          } else {
            parent.insertAfter(linkNode);
          }
        } else {
          node.insertBefore(linkNode);
        }
      }

      if ($isLinkNode(node)) {
        if (node.is(linkNode)) {
          return;
        }
        if (linkNode !== null) {
          const children = node.getChildren();

          for (let i = 0; i < children.length; i++) {
            linkNode.append(children[i]);
          }
        }

        node.remove();
        return;
      }

      if (linkNode !== null) {
        linkNode.append(node);
      }
    });
  }
}

function $getAncestor<NodeType extends LexicalNode = LexicalNode>(
  node: LexicalNode,
  predicate: (ancestor: LexicalNode) => ancestor is NodeType
) {
  let parent = node;
  while (parent !== null && parent.getParent() !== null && !predicate(parent)) {
    parent = parent.getParentOrThrow();
  }
  return predicate(parent) ? parent : null;
}
