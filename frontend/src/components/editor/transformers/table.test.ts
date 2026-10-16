import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { roundTripMarkdown } from './test-utils';

describe('TABLE round trip', () => {
  it('round-trips a table with a header row', () => {
    const markdown = ['| a   | b   |', '| --- | --- |', '| 1   | 2   |'].join(
      '\n'
    );

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });

  it('keeps escaped pipes inside a single cell', () => {
    const markdown = ['| a\\|b | 2   |', '| ---- | --- |'].join('\n');

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });

  it('keeps escaped pipes inside inline code', () => {
    const markdown = ['| `c\\|d` | 2   |', '| ------ | --- |'].join('\n');

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });
});
