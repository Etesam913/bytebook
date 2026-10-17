import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { extractCodeLanguages, hasMarkdownSyntax, hasRichHtml } from './paste';

describe('hasMarkdownSyntax', () => {
  it.each([
    '**bold**',
    '__bold__',
    '~~removed~~',
    '`code`',
    '[Bytebook](https://example.com)',
    '# Heading',
    '   ###### Heading',
    '> Quote',
    '- Item',
    '* Item',
    '+ Item',
    '1. Item',
    '---',
    '```python\nprint(1)\n```',
    'Introduction\n## Heading',
  ])('recognizes Markdown in %j', (text) => {
    expect(hasMarkdownSyntax(text)).toBe(true);
  });

  it.each([
    '',
    'Plain text',
    'https://example.com',
    'some_variable_name',
    '#hashtag',
    '####### Too many heading markers',
    '    # Indented text',
    'Text with > and - in the middle',
    '[Label without a destination]',
  ])('does not interpret %j as Markdown', (text) => {
    expect(hasMarkdownSyntax(text)).toBe(false);
  });
});

describe('hasRichHtml', () => {
  it.each([
    '<strong>Bold</strong>',
    '<EM>Emphasis</EM>',
    '<code class="language-python">print(1)</code>',
    '<h2>Heading</h2>',
    '<ul><li>Item</li></ul>',
    '<blockquote>Quote</blockquote>',
    '<a href="https://example.com">Link</a>',
    '<img src="photo.png">',
    '<table><tr><td>Cell</td></tr></table>',
    '<pre>Code</pre>',
    '<del>Removed</del>',
    '<mark>Highlighted</mark>',
    '<hr />',
  ])('preserves semantic HTML in %j', (html) => {
    expect(hasRichHtml(html)).toBe(true);
  });

  it.each([
    '',
    'Plain text',
    '<div><span style="color: red">**bold**</span></div>',
    '<p>Plain paragraph<br>Another line</p>',
    '<article><section>Text</section></article>',
    '&lt;strong&gt;escaped tag&lt;/strong&gt;',
  ])('does not treat %j as semantic formatting', (html) => {
    expect(hasRichHtml(html)).toBe(false);
  });
});

describe('extractCodeLanguages', () => {
  it('returns supported languages once in first-seen order', () => {
    const markdown = [
      '```python\nprint(1)\n```',
      '```go\npackage main\n```',
      '```python\nprint(2)\n```',
      '```javascript\nconsole.log(1)\n```',
      '```java\nclass Main {}\n```',
      '```text\nPlain text\n```',
    ].join('\n');

    const result = extractCodeLanguages(markdown);

    expect(result).toEqual(['python', 'go', 'javascript', 'java', 'text']);
  });

  it('ignores unsupported languages and aliases', () => {
    const markdown =
      '```rust\nfn main() {}\n```\n```js\nconsole.log(1)\n```\n```Python\nprint(1)\n```';

    expect(extractCodeLanguages(markdown)).toEqual([]);
  });

  it.each([
    '',
    'Plain text',
    '```\nUnlabelled code\n```',
    '`python`',
    'Text ```python',
  ])('does not extract a language from %j', (markdown) => {
    expect(extractCodeLanguages(markdown)).toEqual([]);
  });
});
