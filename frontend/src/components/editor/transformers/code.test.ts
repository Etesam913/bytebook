import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { createEditor } from 'lexical';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import { CodeNode } from '../nodes/code';
import { CODE_TRANSFORMER, extractCodeContent } from './code';

function roundTrip(markdown: string) {
  const editor = createEditor({
    nodes: [CodeNode],
    onError: (error) => {
      throw error;
    },
  });
  let output = '';
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, [CODE_TRANSFORMER], undefined, true);
    },
    { discrete: true }
  );
  editor.read(() => {
    output = $convertToMarkdownString([CODE_TRANSFORMER], undefined, true);
  });
  return output;
}

describe('extractCodeContent', () => {
  it('returns an empty string when there are no lines between fences', () => {
    const code = extractCodeContent(['```python', 'python'], ['```'], null);

    expect(code).toBe('');
  });

  it('keeps same-line fenced code after the parsed language', () => {
    const code = extractCodeContent(
      ['```python print("Hello")```', 'python'],
      ['```'],
      [' print("Hello")']
    );

    expect(code).toBe('python print("Hello")');
  });

  it('removes the markdown shortcut spacer for unfinished single-line blocks', () => {
    const code = extractCodeContent(['```python', 'python'], null, [
      ' print("Hello")',
    ]);

    expect(code).toBe('print("Hello")');
  });

  it('removes one spacer before the first content line in multi-line blocks', () => {
    const code = extractCodeContent(
      ['```python', 'python'],
      ['```'],
      [' print("Hello")', 'print("Goodbye")', '']
    );

    expect(code).toBe('print("Hello")\nprint("Goodbye")');
  });

  it('preserves leading blank lines in fenced code blocks', () => {
    const code = extractCodeContent(
      ['```python id="b1a159bf-675b-49d5-b9f2-6afb4b69fb6f"', 'python'],
      ['```'],
      ['', '', '', 'print("Hello, World!")', '', '', '']
    );

    expect(code).toBe('\n\nprint("Hello, World!")\n\n');
  });

  it('drops the empty remainders of the opening and closing fence lines', () => {
    const code = extractCodeContent(
      ['```python id="abc"', 'python', 'id="abc"'],
      ['```'],
      ['', 'print(1)', '']
    );

    expect(code).toBe('print(1)');
  });

  it('keeps the last line of an unterminated block', () => {
    const code = extractCodeContent(['```python', 'python'], null, [
      '',
      'print(1)',
      '',
    ]);

    expect(code).toBe('print(1)\n');
  });
});

describe('CODE_TRANSFORMER round trip', () => {
  it('does not add blank lines on load/save', () => {
    const markdown = '```python id="abc"\nprint(1)\n```';

    expect(roundTrip(markdown)).toBe(markdown);
    expect(roundTrip(roundTrip(markdown))).toBe(markdown);
  });

  it('preserves intentional leading and trailing blank lines', () => {
    const markdown = '```python id="abc"\n\nprint(1)\n\n```';

    expect(roundTrip(markdown)).toBe(markdown);
  });
});
