import '../test/setup';
import { describe, it, expect } from 'bun:test';
import { getDefaultCodeForLanguage } from './code';
import { LANGUAGES } from '../types';

describe('getDefaultCodeForLanguage', () => {
  it.each([
    [LANGUAGES.PYTHON, 'print("Hello, World!")\n\n\n\n'],
    [LANGUAGES.GO, '%% \nfmt.Println("Hello, World!")\n\n\n\n'],
    [LANGUAGES.JAVASCRIPT, 'console.log("Hello, World!");\n\n\n\n'],
    [LANGUAGES.JAVA, 'System.out.println("Hello, World!");\n\n\n\n'],
    [LANGUAGES.TEXT, ''],
  ])('returns default template for %s', (language, expected) => {
    expect(getDefaultCodeForLanguage(language)).toBe(expected);
  });
});
