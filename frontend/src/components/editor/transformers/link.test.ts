import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { roundTripMarkdown } from './test-utils';

describe('LINK round trip', () => {
  it('does not throw on a literal % in an external URL', () => {
    const exported = roundTripMarkdown('[pct](https://x.com/100%)');

    expect(exported).toBe('[pct](https%3A%2F%2Fx.com%2F100%25)');
    expect(roundTripMarkdown(exported)).toBe(exported);
  });

  it('does not throw on a literal % in an internal path', () => {
    const markdown = '[note](/notes/folder/100%25.md)';

    expect(roundTripMarkdown('[note](/notes/folder/100%.md)')).toBe(markdown);
  });

  it('round-trips encoded external URLs', () => {
    const markdown = '[x](https%3A%2F%2Fx.com%2Fa%20b)';

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });
});
