import { LANGUAGES, type Languages } from '@/types';

// Display names for each supported code block language.
export const LANGUAGE_DISPLAY_NAMES: Record<Languages, string> = {
  [LANGUAGES.PYTHON]: 'Python',
  [LANGUAGES.GO]: 'Go',
  [LANGUAGES.JAVASCRIPT]: 'Javascript',
  [LANGUAGES.JAVA]: 'Java',
  [LANGUAGES.TEXT]: 'Text',
};

/**
 * Returns the default code template for a given programming language.
 */
export function getDefaultCodeForLanguage(language: Languages) {
  switch (language) {
    case LANGUAGES.PYTHON:
      return 'print("Hello, World!")\n\n\n\n';
    case LANGUAGES.GO:
      return 'fmt.Println("Hello, World!")\n\n\n\n';
    case LANGUAGES.JAVASCRIPT:
      return 'console.log("Hello, World!");\n\n\n\n';
    case LANGUAGES.JAVA:
      return 'System.out.println("Hello, World!");\n\n\n\n';
    case LANGUAGES.TEXT:
      return '';
    default:
      return '';
  }
}
