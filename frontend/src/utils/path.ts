import { FILE_SERVER_URL } from './general';

type FilePathAdditionalQueryParams = {
  highlight: string;
};

/**
 * Abstract class representing a generic path interface. Use subclass GlobalFilePath or LocalFilePath.
 */
export abstract class Path {
  abstract equals(other: this): boolean;
  abstract toString(): string;
  abstract getFileUrl(): string;

  static isLocalFilePath(path: Path): path is LocalFilePath {
    return path instanceof LocalFilePath;
  }

  static isGlobalFilePath(path: Path): path is GlobalFilePath {
    return path instanceof GlobalFilePath;
  }
}

/**
 * Utility class that represents a file path to a global file like an image or video hosted
 * on a website.
 */
export class GlobalFilePath extends Path {
  readonly url: string;

  constructor({ url }: { url: string }) {
    super();
    this.url = url;
  }

  equals(other: GlobalFilePath) {
    return this.url === other.url;
  }

  toString() {
    return this.url;
  }

  getFileUrl() {
    return this.url;
  }
}

/**
 * Utility class that represents a file path to a local file like a markdown note or an attachment.
 *
 * @example
 * // Example usage:
 * const converter = new FilePath({ folder: "docs", note: "readme.md" });
 * console.log(filePath.folder); // "docs"
 * console.log(filePath.note); // "readme.md"
 * console.log(filePath.noteWithoutExtension); // "readme"
 * console.log(filePath.noteExtension); // "md"
 * console.log(filePath.noteWithExtensionParam); // "readme?ext=md"
 */
export class LocalFilePath extends Path {
  readonly folder: string;
  readonly note: string;
  readonly noteWithoutExtension: string;
  readonly noteExtension: string;
  readonly noteWithExtensionParam: string;

  constructor({ folder, note }: { folder: string; note: string }) {
    super();
    this.folder = folder;
    this.note = note;
    const noteExtension = this.getExtensionFromNote(note);
    if (!noteExtension) {
      throw new Error(`Note must have an extension: ${note}`);
    }
    this.noteWithoutExtension = this.getNoteWithoutExtension(note);
    this.noteExtension = noteExtension;
    this.noteWithExtensionParam = `${this.noteWithoutExtension}?ext=${this.noteExtension}`;
  }

  /**
   * Returns the note name without its extension.
   * @param note - The note file name (e.g., "readme.md").
   * @returns The note name without extension (e.g., "readme").
   */
  private getNoteWithoutExtension(note: string): string {
    const lastDotIndex = note.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return note;
    }
    return note.substring(0, lastDotIndex);
  }

  /**
   * Returns the extension of the note file.
   * @param note - The note file name (e.g., "readme.md").
   * @returns The extension (e.g., "md"), or null if none found.
   */
  private getExtensionFromNote(note: string): string | null {
    const lastDotIndex = note.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return null;
    }
    return note.substring(lastDotIndex + 1);
  }

  /**
   * Checks if the current FilePath is equal to another FilePath.
   * @param other - The other FilePath to compare with.
   * @returns true if the two FilePaths are equal, false otherwise.
   */
  equals(other: LocalFilePath) {
    return this.folder === other.folder && this.note === other.note;
  }

  /**
   * Returns the string representation of the FilePath in the format "folder/note".
   *
   * @example
   * const filePath = new FilePath({ folder: "docs", note: "readme.md" });
   * filePath.toString(); // "docs/readme.md"
   */
  toString() {
    return `${this.folder}/${this.note}`;
  }

  /**
   * Returns a URL path (without the '/notes' prefix) to the note, including its folder and note name,
   * and includes the note's extension as the 'ext' query parameter.
   *
   * This is useful for constructing custom note links or for route helpers.
   *
   * @param extraParams - An optional object of additional query parameters to add to the link.
   * @returns The link to the note in the format "/{folder}/{note}?ext={ext}&key=value"
   *
   * @example
   * // Given FilePath with { folder: 'docs', note: 'readme.md' }
   * filePath.getLinkToNoteWithoutNotesPrefix();
   * // => "/docs/readme?ext=md"
   *
   * filePath.getLinkToNoteWithoutNotesPrefix({ view: 'preview' });
   * // => "/docs/readme?ext=md&view=preview"
   */
  getLinkToNoteWithoutNotesPrefix(extraParams?: FilePathAdditionalQueryParams) {
    const params = new URLSearchParams({ ext: this.noteExtension });
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, String(value));
      }
    }
    return `/${this.folder}/${encodeURIComponent(this.noteWithoutExtension)}?${params.toString()}`;
  }

  /**
   * Returns a link to the note, with optional additional query parameters.
   * @param extraParams - An object of additional query parameters to add to the link.
   * @returns The link to the note with query parameters.
   *
   * @example
   * const filePath = new FilePath({ folder: "docs", note: "readme.md" });
   * filePath.getLinkToNote(); // "/docs/readme?ext=md"
   * filePath.getLinkToNote({ foo: "bar" }); // "/docs/readme?ext=md&foo=bar"
   */
  getLinkToNote(extraParams?: FilePathAdditionalQueryParams) {
    return `/notes${this.getLinkToNoteWithoutNotesPrefix(extraParams)}`;
  }

  /**
   * Returns the server URL to directly access the note file.
   *
   * @returns {string} The file URL in the format "${FILE_SERVER_URL}/notes/{folder}/{note}".
   *
   * @example
   * const filePath = new FilePath({ folder: "docs", note: "readme.md" });
   * filePath.getFileUrl(); // "http://localhost:5890/notes/docs/readme.md"
   */
  getFileUrl() {
    return `${FILE_SERVER_URL}/notes/${this.folder}/${this.note}`;
  }
}
