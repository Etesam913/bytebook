import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { createCodeGhost } from './code-ghost';

describe('code drag preview', () => {
  it('shows the language icon and name without copying the editor', () => {
    const source = document.createElement('div');
    source.innerHTML =
      '<span data-code-language-icon><svg><path d="M0 0" /></svg></span><div class="cm-editor">print(1)</div>';

    const preview = createCodeGhost({ language: 'python', source });

    expect(preview.textContent).toBe('Python');
    expect(preview.querySelector('svg path')).not.toBeNull();
    expect(preview.querySelector('.cm-editor')).toBeNull();
    expect(source.querySelector('svg path')).not.toBeNull();
  });

  it('shows the language name if the icon is not mounted', () => {
    const preview = createCodeGhost({
      language: 'javascript',
      source: document.createElement('div'),
    });

    expect(preview.textContent).toBe('JavaScript');
  });
});
