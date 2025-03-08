import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

/** Clears all highlights in the note */
export function clearHighlights(editor: LexicalEditor, callback?: () => void) {
  editor.update(() => {
    /** Helper function to recursively clear highlight styles from text nodes */
    function clearHighlightNode(node: LexicalNode) {
      // Skip nodes that are not element nodes
      if (!$isElementNode(node)) return;

      const children = node.getChildren();
      const textChildren = children.filter($isTextNode);

      // If there are no immediate text children, recursively search children
      if (textChildren.length === 0) {
        for (const child of children) {
          clearHighlightNode(child);
        }
        return;
      }

      // Remove highlight styles from all text nodes
      for (const textNode of textChildren) {
        textNode.setStyle('');
      }
    }

    // Start the recursive clearing of highlights from the root's children
    const children = $getRoot().getChildren();
    for (const child of children) {
      clearHighlightNode(child);
    }
  });

  callback?.();
}

/** Highlights all matches of the search string in the note */
export function searchWithinNote(
  editor: LexicalEditor,
  searchString: string,
  callback: () => void
) {
  editor.update(() => {
    const regex = new RegExp(searchString, 'gi');

    /** Helper function to recursively search and highlight text nodes */
    function highlightNode(node: LexicalNode) {
      // We can't highlight node elements
      if (!$isElementNode(node)) return;

      const children = node.getChildren();
      const textChildren = children.filter($isTextNode);

      // If there are no immediate text children, recursively search children
      if (textChildren.length === 0) {
        for (const child of children) {
          highlightNode(child);
        }
        return;
      }

      // Removing any potential highlight from text so that the previous search highlight can be undo
      for (const textNode of textChildren) {
        textNode.setStyle('background-color: none;color: inherit');
      }

      const text = node.getTextContent();
      const indexes = [];
      let result = regex.exec(text);
      while (result) {
        indexes.push(result.index);
        result = regex.exec(text);
      }

      if (!indexes.length) return;

      // Chunks are used to split the text into multiple texts with each text potentially having a highlight style if it matched
      const chunks = [];
      if (indexes[0] !== 0) chunks.push(0);
      for (const index of indexes)
        chunks.push(index, index + searchString.length);
      if (chunks.at(-1) !== text.length) chunks.push(text.length);

      // Removing the unhighlighted version of the text
      node.clear();

      for (let i = 0; i < chunks.length - 1; i++) {
        const start = chunks[i];
        const end = chunks[i + 1];
        const textNode = $createTextNode(text.slice(start, end));

        // Adding a highlighted text chunk
        if (indexes.includes(chunks[i])) {
          textNode.setStyle('background-color: #FFFF00;color: #000000');
        }
        node.append(textNode);
      }
    }

    const children = $getRoot().getChildren();
    for (const child of children) highlightNode(child);
  });

  callback();
}
