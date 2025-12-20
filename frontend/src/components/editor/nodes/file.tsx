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
import type { FileDimensions } from './types';
import { File } from '../../file';

export type FileType = 'image' | 'video' | 'pdf' | 'youtube' | 'unknown';
const DEFAULT_DIMENSIONS = { width: 312 };

export interface FilePayload {
  alt: string;
  dimensions?: FileDimensions;
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
      dimensions: DEFAULT_DIMENSIONS,
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
      dimensions: { width: 256 },
    });
    parentNode.append(node);
    return { node: node };
  }

  const unknown = $createFileNode({
    alt: 'Unknown',
    src: '',
    dimensions: DEFAULT_DIMENSIONS,
  });
  parentNode.append(unknown);

  return { node: unknown };
}

type SerializedFileNode = Spread<
  {
    alt: string;
    dimensions?: FileDimensions;
    src: string;
  },
  SerializedLexicalNode
>;

export class FileNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;
  __dimensions: FileDimensions;
  __elementType: FileType;

  static getType(): string {
    return 'file';
  }

  static clone(node: FileNode): FileNode {
    return new FileNode({
      src: node.__src,
      alt: node.__alt,
      dimensions: node.__dimensions,
      key: node.__key,
    });
  }

  static importJSON(serializedNode: SerializedFileNode): FileNode {
    const { alt, dimensions, src } = serializedNode;
    const node = $createFileNode({
      alt,
      dimensions,
      src,
    });
    return node;
  }

  exportDOM(): DOMExportOutput {
    let element: HTMLImageElement | HTMLVideoElement | null = null;
    // if (this.__elementType === "image") {
    element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__alt);
    element.setAttribute('width', this.__dimensions.width.toString());
    if (this.__dimensions.height) {
      element.setAttribute('height', this.__dimensions.height.toString());
    }
    if (this.__elementType === 'video') {
      element = document.createElement('video') as HTMLVideoElement;
      element.setAttribute('src', this.__src);
      element.setAttribute('title', this.__alt);
      element.setAttribute('width', this.__dimensions.width.toString());
      if (this.__dimensions.height) {
        element.setAttribute('height', this.__dimensions.height.toString());
      }
    }

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
    dimensions,
    key,
  }: {
    src: string;
    alt: string;
    dimensions?: FileDimensions;
    key?: NodeKey;
  }) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    if (dimensions) {
      this.__dimensions = dimensions;
    } else {
      this.__dimensions = DEFAULT_DIMENSIONS;
    }
    this.__elementType = 'unknown';
  }

  exportJSON(): SerializedFileNode {
    return {
      alt: this.getAltText(),
      dimensions: this.getDimensions(),
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

  getDimensions(): FileDimensions {
    return this.__dimensions;
  }

  setDimensions(dimensions: FileDimensions, editor: LexicalEditor): void {
    editor.update(() => {
      const writable = this.getWritable();
      writable.__dimensions = dimensions;
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
        dimensionsWrittenToNode={this.getDimensions()}
        writeDimensionsToNode={(dimensions) =>
          this.setDimensions(dimensions, _editor)
        }
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
  dimensions,
  key,
}: FilePayload): FileNode {
  return $applyNodeReplacement(new FileNode({ src, alt, dimensions, key }));
}

export function $isFileNode(
  node: LexicalNode | null | undefined
): node is FileNode {
  return node instanceof FileNode;
}
