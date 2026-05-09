import '../../../test/setup';
import { describe, expect, it } from 'bun:test';
import { extractCodeContent } from './code';

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
      [' print("Hello")', 'print("Goodbye")']
    );

    expect(code).toBe('print("Hello")\nprint("Goodbye")');
  });

  it('preserves leading blank lines in fenced code blocks', () => {
    const code = extractCodeContent(
      ['```python id="b1a159bf-675b-49d5-b9f2-6afb4b69fb6f"', 'python'],
      ['```'],
      ['', '', 'print("Hello, World!")', '', '']
    );

    expect(code).toBe('\n\nprint("Hello, World!")\n\n');
  });
});
