import type { Extension } from '@codemirror/state';
import type { Languages } from '../../types';

// Lazy-loaded language extensions. Each grammar lives in its own chunk
// (chunk-lang-*.js) so unused languages aren't shipped on initial load.
const languageLoaders: Record<Languages, (() => Promise<Extension>) | null> = {
  python: () => import('@codemirror/lang-python').then((m) => m.python()),
  go: () => import('@codemirror/lang-go').then((m) => m.go()),
  javascript: () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript()),
  java: () => import('@codemirror/lang-java').then((m) => m.java()),
  text: null,
};

const languageExtensionCache = new Map<Languages, Promise<Extension>>();
const loadedLanguageExtensions = new Map<Languages, Extension>();

export function loadLanguageExtension(
  language: Languages
): Promise<Extension> | null {
  const loader = languageLoaders[language];
  if (!loader) return null;
  let cached = languageExtensionCache.get(language);
  if (!cached) {
    cached = loader().then((ext) => {
      loadedLanguageExtensions.set(language, ext);
      return ext;
    });
    languageExtensionCache.set(language, cached);
  }
  return cached;
}

// Returns an already-resolved extension synchronously, or null if it hasn't
// been awaited yet. Used by CodeMirrorEditor's useState initializer so a
// preloaded grammar is on the very first render — no later reconfigure, no
// race with the lazy import.
export function getLoadedLanguageExtension(
  language: Languages
): Extension | null {
  return loadedLanguageExtensions.get(language) ?? null;
}

export function preloadLanguageExtensions(
  languages: Languages[]
): Promise<void> {
  const promises: Promise<Extension>[] = [];
  for (const language of languages) {
    const promise = loadLanguageExtension(language);
    if (promise) promises.push(promise);
  }
  return Promise.all(promises).then(() => undefined);
}
