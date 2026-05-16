import '../test/setup';
import { describe, it, expect } from 'bun:test';
import { getDefaultCodeForLanguage } from './code';
import { LANGUAGES } from '../types';

describe('getDefaultCodeForLanguage', () => {
  it('returns the python hello-world template', () => {
    expect(getDefaultCodeForLanguage(LANGUAGES.PYTHON)).toBe(
      'print("Hello, World!")\n\n\n\n'
    );
  });

  it('returns the go hello-world template with the %% prefix', () => {
    expect(getDefaultCodeForLanguage(LANGUAGES.GO)).toBe(
      '%% \nfmt.Println("Hello, World!")\n\n\n\n'
    );
  });

  it('returns the javascript hello-world template', () => {
    expect(getDefaultCodeForLanguage(LANGUAGES.JAVASCRIPT)).toBe(
      'console.log("Hello, World!");\n\n\n\n'
    );
  });

  it('returns the java hello-world template', () => {
    expect(getDefaultCodeForLanguage(LANGUAGES.JAVA)).toBe(
      'System.out.println("Hello, World!");\n\n\n\n'
    );
  });

  it('returns an empty string for the text language', () => {
    expect(getDefaultCodeForLanguage(LANGUAGES.TEXT)).toBe('');
  });
});
