import { describe, expect, it } from 'bun:test';
import { parseSearchExcerpt } from './search-excerpt';

describe('parseSearchExcerpt', () => {
  it('only treats known highlight wrappers as markup', () => {
    const html =
      'Use <mark>Redis</mark> &amp; &lt;script&gt; <img src=x onerror=alert(1)>';

    const parts = parseSearchExcerpt(html);

    expect(parts).toEqual([
      { text: 'Use ', highlighted: false },
      { text: 'Redis', highlighted: true },
      { text: ' & <script> <img src=x onerror=alert(1)>', highlighted: false },
    ]);
  });

  it('decodes numeric entities without interpreting escaped marks', () => {
    const html = '&#34;&lt;mark&gt;&#x1f600;&lt;/mark&gt;';

    const parts = parseSearchExcerpt(html);

    expect(parts).toEqual([{ text: '"<mark>😀</mark>', highlighted: false }]);
  });
});
