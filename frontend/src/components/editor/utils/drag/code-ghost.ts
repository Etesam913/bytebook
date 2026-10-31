import type { Languages } from '@/types';
import { languageDisplayConfig } from '@components/code/language-config';

export function createCodeGhost({
  language,
  source,
}: {
  language: Languages;
  source: HTMLElement;
}): HTMLElement {
  const preview = document.createElement('div');
  preview.className =
    'flex items-center gap-2 px-2 py-1 text-sm whitespace-nowrap [font-family:var(--app-font-family)]';

  // Only copy the small language icon, not the CodeMirror editor DOM.
  const icon = source.querySelector('[data-code-language-icon] svg');
  if (icon) preview.appendChild(icon.cloneNode(true));

  const label = document.createElement('span');
  label.textContent = languageDisplayConfig[language].label;
  preview.appendChild(label);
  return preview;
}
