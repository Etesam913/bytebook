import { describe, expect, it } from 'bun:test';
import {
  $createParagraphNode,
  $createLineBreakNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from 'lexical';
import { navigateToMatch, performSearch } from './find';
import { highlightMatch } from './highlight';

function createTextEditor(text: string) {
  const editor = createEditor({
    onError: (error) => {
      throw error;
    },
  });
  editor.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)));
    },
    { discrete: true }
  );
  return editor;
}

describe('performSearch', () => {
  it('finds every occurrence regardless of case', () => {
    const editor = createTextEditor('Hello hELLo HELLO');

    const matches = performSearch(editor, 'HeLLo');

    expect(matches.map(({ start, end }) => ({ start, end }))).toEqual([
      { start: 0, end: 4 },
      { start: 6, end: 10 },
      { start: 12, end: 16 },
    ]);
  });

  it('includes overlapping matches', () => {
    const editor = createTextEditor('banana');

    const matches = performSearch(editor, 'ana');

    expect(matches.map(({ start, end }) => ({ start, end }))).toEqual([
      { start: 1, end: 3 },
      { start: 3, end: 5 },
    ]);
  });

  it('searches separate formatted text nodes in document order', () => {
    const editor = createEditor({
      onError: (error) => {
        throw error;
      },
    });
    let plainKey = '';
    let boldKey = '';
    editor.update(
      () => {
        const plain = $createTextNode('match ');
        const bold = $createTextNode('MATCH').toggleFormat('bold');
        plainKey = plain.getKey();
        boldKey = bold.getKey();
        $getRoot().append($createParagraphNode().append(plain, bold));
      },
      { discrete: true }
    );

    const matches = performSearch(editor, 'match');

    expect(
      matches.map(({ nodeKey, start, end }) => ({ nodeKey, start, end }))
    ).toEqual([
      { nodeKey: plainKey, start: 0, end: 4 },
      { nodeKey: boldKey, start: 0, end: 4 },
    ]);
  });

  it('matches a word spanning formatted text nodes', () => {
    const editor = createEditor({
      onError: (error) => {
        throw error;
      },
    });
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode('hel'),
            $createTextNode('lo').toggleFormat('bold')
          )
        );
      },
      { discrete: true }
    );

    const matches = performSearch(editor, 'hello');

    expect(matches).toHaveLength(1);
    expect(matches[0].start).toBe(0);
    expect(matches[0].end).toBe(1);
    expect(matches[0].nodeKey).not.toBe(matches[0].endNodeKey);
  });

  it.each(['paragraph', 'line break'])(
    'does not join text across a %s',
    (boundary) => {
      const editor = createEditor({
        onError: (error) => {
          throw error;
        },
      });
      editor.update(
        () => {
          const paragraph = $createParagraphNode().append(
            $createTextNode('hel')
          );
          $getRoot().append(paragraph);
          if (boundary === 'paragraph') {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('lo'))
            );
          } else {
            paragraph.append($createLineBreakNode(), $createTextNode('lo'));
          }
        },
        { discrete: true }
      );

      expect(performSearch(editor, 'hello')).toEqual([]);
    }
  );

  it.each(['', '   ', 'absent'])('returns no matches for %j', (term) => {
    const editor = createTextEditor('some text');

    expect(performSearch(editor, term)).toEqual([]);
  });

  it.each(['"', '”'])('matches the literal quote %j', (quote) => {
    const editor = createTextEditor('a"b”c');

    const matches = performSearch(editor, quote);

    expect(matches.map(({ start, end }) => ({ start, end }))).toEqual([
      { start: quote === '"' ? 1 : 3, end: quote === '"' ? 1 : 3 },
    ]);
  });
});

describe('navigateToMatch', () => {
  it.each(['next', 'previous'] as const)(
    'moves %s between cross-node matches after clearing the old highlight',
    (direction) => {
      const editor = createEditor({
        onError: (error) => {
          throw error;
        },
      });
      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('hel'),
              $createTextNode('lo hel').toggleFormat('bold'),
              $createTextNode('lo')
            )
          );
        },
        { discrete: true }
      );
      const matchData = performSearch(editor, 'hello');
      expect(matchData).toHaveLength(2);
      const current = direction === 'next' ? 1 : 0;
      highlightMatch(editor, matchData[current]);
      let selectedIndex: number = current;

      navigateToMatch({
        editor,
        matchData,
        currentMatchIndex: current,
        setCurrentMatchIndex: (index) => {
          selectedIndex = index;
        },
        direction,
      });

      expect(selectedIndex).toBe(direction === 'next' ? 0 : 1);
      editor.read(() => {
        expect(
          $getRoot()
            .getAllTextNodes()
            .map((node) => ({
              text: node.getTextContent(),
              highlighted: node.hasFormat('highlight'),
            }))
        ).toEqual(
          direction === 'next'
            ? [
                { text: 'hel', highlighted: true },
                { text: 'lo', highlighted: true },
                { text: ' hel', highlighted: false },
                { text: 'lo', highlighted: false },
              ]
            : [
                { text: 'hel', highlighted: false },
                { text: 'lo ', highlighted: false },
                { text: 'hel', highlighted: true },
                { text: 'lo', highlighted: true },
              ]
        );
      });
    }
  );

  it.each([
    { direction: 'next' as const, current: 1, expected: 0, text: 'first' },
    { direction: 'previous' as const, current: 0, expected: 1, text: 'second' },
  ])(
    'wraps when moving $direction past the boundary',
    ({ direction, current, expected, text }) => {
      const editor = createTextEditor('first second');
      const matchData = [
        ...performSearch(editor, 'first'),
        ...performSearch(editor, 'second'),
      ];
      highlightMatch(editor, matchData[current]);
      let selectedIndex: number = current;

      navigateToMatch({
        editor,
        matchData,
        currentMatchIndex: current,
        setCurrentMatchIndex: (index) => {
          selectedIndex = index;
        },
        direction,
      });

      expect(selectedIndex).toBe(expected);
      editor.read(() => {
        expect(
          $getRoot()
            .getAllTextNodes()
            .filter((node) => node.hasFormat('highlight'))
            .map((node) => node.getTextContent())
        ).toEqual([text]);
      });
    }
  );
});
