import '../test/setup';
import { describe, it, expect } from 'bun:test';
import { getDefaultCodeForLanguage } from './code';

describe('getDefaultCodeForLanguage', () => {
  it('returns the python hello-world template', () => {
    expect(getDefaultCodeForLanguage('python')).toBe(
      'print("Hello, World!")\n\n\n\n'
    );
  });

  it('returns the go hello-world template with the %% prefix', () => {
    expect(getDefaultCodeForLanguage('go')).toBe(
      '%% \nfmt.Println("Hello, World!")\n\n\n\n'
    );
  });

  it('returns the javascript hello-world template', () => {
    expect(getDefaultCodeForLanguage('javascript')).toBe(
      'console.log("Hello, World!");\n\n\n\n'
    );
  });

  it('returns the java hello-world template', () => {
    expect(getDefaultCodeForLanguage('java')).toBe(
      'System.out.println("Hello, World!");\n\n\n\n'
    );
  });

  it('returns an empty string for the text language', () => {
    expect(getDefaultCodeForLanguage('text')).toBe('');
  });
});
