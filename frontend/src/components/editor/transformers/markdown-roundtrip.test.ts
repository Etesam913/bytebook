import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { $getRoot, $isElementNode, type LexicalNode } from 'lexical';
import { $isLinkNode } from '@lexical/link';
import { $isTableCellNode, $isTableNode } from '@lexical/table';
import { WAILS_URL } from '@utils/general';
import { getDefaultCodeForLanguage } from '@utils/code';
import { importMarkdown, roundTripMarkdown } from './test-utils';

function $findNode<T extends LexicalNode>(
  predicate: (node: LexicalNode) => node is T
): T | null {
  const stack: LexicalNode[] = [$getRoot()];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (predicate(node)) return node;
    if ($isElementNode(node)) stack.push(...node.getChildren());
  }
  return null;
}

describe('markdown round trip stability', () => {
  // Every saved note goes through export -> import -> export on the next load
  const documents: Record<string, string> = {
    'mixed document': [
      '# Title',
      '',
      'Some **bold** text with a [link](https%3A%2F%2Fx.com) and ![cat?width=200](/notes/f/cat.png) inline.',
      '',
      '- one',
      '- two',
      '',
      '```python id="abc"',
      '',
      'print(1)',
      '',
      '```',
      '',
      '| a   | b   |',
      '| --- | --- |',
      '| 1   | 2   |',
      '',
      '***',
    ].join('\n'),
    'code block': '```python id="abc"\nprint(1)\n```',
    'code block with quotes in the id': '```python id="a\\"b"\nprint(1)\n```',
    image: 'before ![cat?width=200&height=100](/x.png) after',
    'internal link': '[n](/notes/My%20Folder/a%20b.md)',
    'external link': '[x](https%3A%2F%2Fx.com%2Fa%20b)',
    table: '| a\\|b | `c\\|d` |\n| ---- | ------ |\n| 1    | 2      |',
  };

  for (const [name, markdown] of Object.entries(documents)) {
    it(`leaves a ${name} unchanged`, () => {
      const once = roundTripMarkdown(markdown);

      expect(once).toBe(markdown);
      expect(roundTripMarkdown(once)).toBe(once);
    });
  }
});

describe('CODE_TRANSFORMER', () => {
  it('generates a stable id when one is missing', () => {
    const exported = roundTripMarkdown('```python\nprint(1)\n```');

    expect(exported).toMatch(/^```python id="[0-9a-f-]{36}"\nprint\(1\)\n```$/);
    expect(roundTripMarkdown(exported)).toBe(exported);
  });

  it('falls back to text for unknown languages', () => {
    expect(roundTripMarkdown('```foo id="x"\nhi\n```')).toBe(
      '```text id="x"\nhi\n```'
    );
  });

  it('fills an empty block with the default code for its language', () => {
    expect(roundTripMarkdown('```python id="x"\n```')).toBe(
      `\`\`\`python id="x"\n${getDefaultCodeForLanguage('python')}\n\`\`\``
    );
  });
});

describe('FILE_TRANSFORMER', () => {
  it('round-trips width and height', () => {
    const markdown = '![cat?width=200&height=100](/x.png)';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });

  it('round-trips an alt that only holds dimensions', () => {
    const markdown = '![?width=200](/x.png)';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });
});

describe('LINK', () => {
  it('imports internal links as decoded wails: URLs', () => {
    let url: string | undefined;
    importMarkdown('[n](/notes/My%20Folder/a%20b.md)').read(() => {
      url = $findNode($isLinkNode)?.getURL();
    });

    expect(url).toBe(`${WAILS_URL}/notes/My Folder/a b.md`);
  });

  it('encodes external URLs on export', () => {
    expect(roundTripMarkdown('[x](https://x.com/a)')).toBe(
      '[x](https%3A%2F%2Fx.com%2Fa)'
    );
  });

  it('keeps square brackets in link text', () => {
    const markdown = '[a%30b%31](https%3A%2F%2Fx.com)';
    let text: string | undefined;
    importMarkdown(markdown).read(() => {
      text = $findNode($isLinkNode)?.getTextContent();
    });

    expect(text).toBe('a[b]');
    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });

  it('keeps text formatting around a link', () => {
    const markdown = '**[a](https%3A%2F%2Fx.com)**';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });
});

describe('TABLE', () => {
  it('turns the divider into a header row', () => {
    let rowHasHeader: boolean[] = [];
    importMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |').read(() => {
      const table = $findNode($isTableNode);
      rowHasHeader =
        table
          ?.getChildren()
          .map(
            (row) =>
              $isElementNode(row) &&
              row
                .getChildren()
                .every((cell) => $isTableCellNode(cell) && cell.hasHeader())
          ) ?? [];
    });

    expect(rowHasHeader).toEqual([true, false]);
  });

  it('pads columns to at least three characters', () => {
    expect(roundTripMarkdown('| a | bb |\n| - | - |')).toBe(
      '| a   | bb  |\n| --- | --- |'
    );
  });

  it('round-trips newlines and inline markdown in cells', () => {
    const markdown = '| a\\nb | **x** | `y` |';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });

  it('pads short rows into the same table', () => {
    let tableCount = 0;
    const markdown = '| a | b |\n| --- | --- |\n| 1 |';
    importMarkdown(markdown).read(() => {
      tableCount = $getRoot().getChildren().filter($isTableNode).length;
    });

    expect(tableCount).toBe(1);
    expect(roundTripMarkdown(markdown)).toBe(
      '| a   | b   |\n| --- | --- |\n| 1   |     |'
    );
  });

  it('pads earlier rows, including the header, when a later row is longer', () => {
    expect(roundTripMarkdown('| a |\n| --- |\n| 1 | 2 |')).toBe(
      '| a   |     |\n| --- | --- |\n| 1   | 2   |'
    );
  });

  it('keeps tables separated by a blank line apart', () => {
    const markdown = '| a   | b   |\n\n| 1   |';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });
});

describe('HR', () => {
  it('exports every horizontal rule style as ***', () => {
    expect(roundTripMarkdown('---\n\n___\n\n***')).toBe('***\n\n***\n\n***');
  });
});
