import type { LexicalNode } from 'lexical';
import { createRoot } from 'react-dom/client';
import { PDFIcon } from '../../../icons/pdf-icon';
import { VideoIcon } from '../../../icons/video';
import type { FileNode } from '../nodes/file';
import { Paintbrush } from '../../../icons/paintbrush.tsx';
/**
 * Constructs a ghost element for dragging based on the type of node
 * @param node - The Lexical node to create a ghost element for
 * @param ghostElement - The HTML element that will become the ghost element
 */
export function constructGhostElementForNode(
  node: LexicalNode,
  ghostElement: HTMLElement
) {
  if (node.getType() === 'file') {
    const fileNode = node as FileNode;
    if (fileNode.getElementType() === 'image') {
      constructGhostElementForImage(node as FileNode, ghostElement);
    } else if (fileNode.getElementType() === 'video') {
      constructGhostElementForVideo(ghostElement);
    } else if (fileNode.getElementType() === 'pdf') {
      constructGhostElementForPdf(ghostElement);
    }
  } else if (node.getType() === 'excalidraw') {
    constructGhostElementForDrawing(ghostElement);
  }
}

/**
 * Constructs a ghost element for an image file node.
 * @param fileNode - The FileNode representing the image.
 * @param ghostElement - The HTML element that will become the ghost element.
 */
function constructGhostElementForImage(
  fileNode: FileNode,
  ghostElement: HTMLElement
) {
  const ghostElementChild = document.createElement('img');
  (ghostElementChild as HTMLImageElement).src = fileNode.getSrc();
  ghostElementChild.style.width = '15rem';
  ghostElementChild.style.height = 'auto';
  ghostElementChild.style.borderRadius = '0.25rem';
  ghostElement.style.padding = '0.5rem';
  ghostElement.replaceChildren(ghostElementChild);
}

/**
 * Constructs a ghost element for a video file node.
 * @param ghostElement - The HTML element that will become the ghost element.
 */
function constructGhostElementForVideo(ghostElement: HTMLElement) {
  const container = document.createElement('div');
  const root = createRoot(container);

  root.render(
    <div className="flex items-center gap-1">
      <VideoIcon width={24} height={24} fill="currentColor" />
      Video
    </div>
  );
  ghostElement.replaceChildren(container);
}

/**
 * Constructs a ghost element for a PDF file node.
 * @param ghostElement - The HTML element that will become the ghost element.
 */
function constructGhostElementForPdf(ghostElement: HTMLElement) {
  const container = document.createElement('div');
  const root = createRoot(container);

  root.render(
    <div className="flex items-center gap-1">
      <PDFIcon width={24} height={24} fill="currentColor" />
      PDF
    </div>
  );
  ghostElement.replaceChildren(container);
}

/**
 * Constructs a ghost element for a drawing node.
 * @param ghostElement - The HTML element that will become the ghost element.
 */
function constructGhostElementForDrawing(ghostElement: HTMLElement) {
  const container = document.createElement('div');
  const root = createRoot(container);

  root.render(
    <div className="flex items-center gap-1">
      <Paintbrush width={24} height={24} fill="currentColor" />
      Drawing
    </div>
  );
  ghostElement.replaceChildren(container);
}
