import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import {
  $applyNodeReplacement,
  $createParagraphNode,
  DecoratorNode,
} from 'lexical';
import type { JSX } from 'react/jsx-runtime';
import type { ResizeWidth } from '../../../types';
import { File } from '../../file';

export type FileType = 'image' | 'video' | 'pdf' | 'youtube' | 'unknown';

export interface FilePayload {
  alt: string;
  width?: ResizeWidth;
  key?: NodeKey;
  src: string;
}

// I think this runs on copy and paste
function convertFileElement(domNode: HTMLElement): null | DOMConversionOutput {
  const parentNode = $createParagraphNode();
  if (domNode.tagName === 'IMG') {
    const image = domNode as HTMLImageElement;
    if (image.src.startsWith('file:///')) {
      return null;
    }
    const { alt, src } = image;
    const node = $createFileNode({
      alt,
      src,
      width: '100%',
    });
    parentNode.append(node);
    return { node: node };
  }
  if (domNode.tagName === 'VIDEO') {
    const video = domNode as HTMLVideoElement;
    const { src, title } = video;
    const node = $createFileNode({
      alt: title,
      src,
      width: '100%',
    });
    parentNode.append(node);
    return { node: node };
  }

  const unknown = $createFileNode({
    alt: 'Unknown',
    src: '',
    width: '100%',
  });
  parentNode.append(unknown);

  return { node: unknown };
}

export type SerializedFileNode = Spread<
  {
    alt: string;
    width?: ResizeWidth;
    src: string;
  },
  SerializedLexicalNode
>;

export class FileNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __width: ResizeWidth;
  __elementType: FileType;

  static getType(): string {
    return 'file';
  }

  static clone(node: FileNode): FileNode {
    return new FileNode({
      src: node.__src,
      alt: node.__alt,
      width: node.__width,
      key: node.__key,
    });
  }

  static importJSON(serializedNode: SerializedFileNode): FileNode {
    const { alt, width, src } = serializedNode;
    const node = $createFileNode({
      alt,
      width,
      src,
    });
    return node;
  }

  exportDOM(): DOMExportOutput {
    let element: HTMLImageElement | null = null;
    // if (this.__elementType === "image") {
    element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__alt);
    element.setAttribute('width', this.__width.toString());
    // }
    // if (this.__elementType === "video") {
    // 	element = document.createElement("video");
    // 	element.setAttribute("src", this.__src);
    // 	element.setAttribute("title", this.__alt);
    // 	element.setAttribute("width", this.__width.toString());
    // }

    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertFileElement,
        priority: 0,
      }),
    };
  }

  constructor({
    src,
    alt,
    width,
    key,
  }: {
    src: string;
    alt: string;
    width?: ResizeWidth;
    key?: NodeKey;
  }) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__width = width ?? '100%';
    this.__elementType = 'unknown';
  }

  exportJSON(): SerializedFileNode {
    return {
      alt: this.getAltText(),
      width: this.getWidth(),
      src: this.getSrc(),
      type: 'file',
      version: 1,
    };
  }

  // View
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__alt;
  }

  getWidth(): ResizeWidth {
    return this.__width;
  }

  setWidth(width: ResizeWidth, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__width = width;
    });
  }

  getElementType(): FileType {
    return this.__elementType;
  }

  isInline(): boolean {
    return true;
  }

  setElementType(elementType: FileType, editor: LexicalEditor): void {
    editor.update(
      () => {
        const writable = this.getWritable();
        writable.__elementType = elementType;
      },
      { tag: 'note:changed-from-other-window' }
    );
  }

  decorate(_editor: LexicalEditor): JSX.Element {
    return (
      <File
        src={this.__src}
        widthWrittenToNode={this.getWidth()}
        writeWidthToNode={(width) => this.setWidth(width, _editor)}
        title={this.getAltText()}
        nodeKey={this.getKey()}
        setElementType={(elementType: FileType) =>
          this.setElementType(elementType, _editor)
        }
      />
    );
  }
}

export function $createFileNode({
  alt,
  src,
  width,
  key,
}: FilePayload): FileNode {
  return $applyNodeReplacement(new FileNode({ src, alt, width, key }));
}

export function $isFileNode(
  node: LexicalNode | null | undefined
): node is FileNode {
  return node instanceof FileNode;
}
