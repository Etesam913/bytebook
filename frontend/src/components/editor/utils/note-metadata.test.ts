import '../../../test/setup';
import { describe, it, expect } from 'bun:test';
import { parseFrontMatter, replaceFrontMatter } from './note-metadata';

describe('parseFrontMatter', () => {
  it('returns an empty frontmatter and the original content when no frontmatter is present', () => {
    const md = '# Hello\n\nbody';
    expect(parseFrontMatter(md)).toEqual({ frontMatter: {}, content: md });
  });

  it('parses simple key-value pairs', () => {
    const md = '---\ntitle: Hello\nauthor: Etesam\n---\n# body';
    const { frontMatter, content } = parseFrontMatter(md);
    expect(frontMatter).toEqual({ title: 'Hello', author: 'Etesam' });
    expect(content).toBe('# body');
  });

  it('parses array values written as YAML lists', () => {
    const md = '---\ntags:\n  - python\n  - go\n---\nbody';
    const { frontMatter, content } = parseFrontMatter(md);
    expect(frontMatter).toEqual({ tags: ['python', 'go'] });
    expect(content).toBe('body');
  });

  it('handles mixed scalars and arrays', () => {
    const md = [
      '---',
      'title: Hello',
      'tags:',
      '  - a',
      '  - b',
      'author: Etesam',
      '---',
      '# body',
    ].join('\n');
    const { frontMatter, content } = parseFrontMatter(md);
    expect(frontMatter).toEqual({
      title: 'Hello',
      tags: ['a', 'b'],
      author: 'Etesam',
    });
    expect(content).toBe('# body');
  });

  it('captures a trailing array at the end of the frontmatter', () => {
    const md = '---\ntitle: Hello\ntags:\n  - python\n  - go\n---\nbody';
    expect(parseFrontMatter(md).frontMatter).toEqual({
      title: 'Hello',
      tags: ['python', 'go'],
    });
  });

  it('drops keys whose array body is empty', () => {
    // Documented quirk: an empty list ("tags:" with no items before the closing ---) is not stored.
    const md = '---\ntags:\n---\nbody';
    expect(parseFrontMatter(md).frontMatter).toEqual({});
  });

  it('returns empty content when the markdown is only frontmatter', () => {
    const md = '---\ntitle: Hello\n---';
    const { frontMatter, content } = parseFrontMatter(md);
    expect(frontMatter).toEqual({ title: 'Hello' });
    expect(content).toBe('');
  });

  it('preserves multi-line body content unchanged', () => {
    const body = '# Heading\n\nLine one\nLine two';
    const md = `---\ntitle: Hello\n---\n${body}`;
    expect(parseFrontMatter(md).content).toBe(body);
  });
});

describe('replaceFrontMatter', () => {
  it('prepends new frontmatter when none exists', () => {
    expect(replaceFrontMatter('# body', { title: 'Hello' })).toBe(
      '---\ntitle: Hello\n---\n# body'
    );
  });

  it('replaces existing frontmatter and parses the new values cleanly', () => {
    // Documented quirk: replacing leaves an extra leading newline in the body
    // (createFrontMatter's trailing "\n" plus the original newline after the closing "---").
    const original = '---\ntitle: Old\n---\n# body';
    const updated = replaceFrontMatter(original, { title: 'New' });
    const { frontMatter, content } = parseFrontMatter(updated);
    expect(frontMatter).toEqual({ title: 'New' });
    expect(content).toBe('\n# body');
  });

  it('formats string arrays as YAML lists with two-space indent', () => {
    const out = replaceFrontMatter('body', { tags: ['python', 'go'] });
    expect(out).toBe('---\ntags:\n  - python\n  - go\n---\nbody');
  });

  it('round-trips through parseFrontMatter for prepended content', () => {
    const data = { title: 'Hello', tags: ['a', 'b'] };
    const md = replaceFrontMatter('# body', data);
    const { frontMatter, content } = parseFrontMatter(md);
    expect(frontMatter).toEqual(data);
    expect(content).toBe('# body');
  });

  it('round-trips frontmatter values when replacing existing frontmatter', () => {
    const original = '---\ntitle: Old\ntags:\n  - x\n---\n# body';
    const data = { title: 'New', tags: ['a', 'b'] };
    const updated = replaceFrontMatter(original, data);
    expect(parseFrontMatter(updated).frontMatter).toEqual(data);
  });

  it('produces empty frontmatter delimiters for empty data', () => {
    expect(replaceFrontMatter('body', {})).toBe('---\n---\nbody');
  });
});
