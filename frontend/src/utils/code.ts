import { Languages } from '../types';

/**
 * Returns the default code template for a given programming language.
 *
 * @param language - The programming language to get the default code for
 * @returns A string containing the default code template for the specified language
 */
export function getDefaultCodeForLanguage(language: Languages) {
  switch (language) {
    case 'python':
      return 'print("Hello, World!")';
    case 'go':
      return '%% \nfmt.Println("Hello, World!")';
    case 'javascript':
      return 'console.log("Hello, World!");';
    case 'java':
      return 'System.out.println("Hello, World!");';
    case 'text':
      return '';
    default:
      return '';
  }
}
