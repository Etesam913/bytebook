import { $getRoot, $isElementNode, type LexicalNode } from 'lexical';
import { $isCodeNode, type CodeNode } from '../nodes/code';

export type CodeBlockResult = {
  codeBlockId: string;
  lastRan: string;
  areResultsHidden: boolean;
  resultHtml: string;
};

export type CodeResultsSidecar = {
  version: number;
  codeBlocks: CodeBlockResult[];
};

function collectCodeNodesFrom(node: LexicalNode, codeNodes: CodeNode[]) {
  if ($isCodeNode(node)) {
    codeNodes.push(node);
    return;
  }
  if (!$isElementNode(node)) {
    return;
  }
  for (const child of node.getChildren()) {
    collectCodeNodesFrom(child, codeNodes);
  }
}

function getCodeNodes() {
  const codeNodes: CodeNode[] = [];
  collectCodeNodesFrom($getRoot(), codeNodes);
  return codeNodes;
}

// Collects persisted code-result state from the current editor so it can be
// written to the note's file sidecar without embedding outputs in markdown.
export function collectCodeResultsSidecar(): CodeResultsSidecar {
  const codeBlocks = getCodeNodes()
    .map((codeNode): CodeBlockResult => {
      const resultHtml = codeNode.getLastExecutedResult() ?? '';
      return {
        codeBlockId: codeNode.getId(),
        lastRan: codeNode.getLastRan(),
        areResultsHidden: codeNode.getHideResults(),
        resultHtml,
      };
    })
    .filter((codeBlock) => codeBlock.resultHtml);

  return {
    version: 1,
    codeBlocks,
  };
}

// Populates saved code results for every code block after a note is rendered.
export function applyCodeResultsSidecar(codeResults?: CodeResultsSidecar) {
  const resultsByID = new Map(
    (codeResults?.codeBlocks ?? []).map((codeBlock) => [
      codeBlock.codeBlockId,
      codeBlock,
    ])
  );

  for (const codeNode of getCodeNodes()) {
    const codeBlock = resultsByID.get(codeNode.getId());
    if (!codeBlock) {
      codeNode.applyPersistedCodeResult({
        resultHtml: '',
        lastRan: '',
        areResultsHidden: false,
      });
      continue;
    }
    codeNode.applyPersistedCodeResult({
      resultHtml: codeBlock.resultHtml,
      lastRan: codeBlock.lastRan,
      areResultsHidden: codeBlock.areResultsHidden,
    });
  }
}
