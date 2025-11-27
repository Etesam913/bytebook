import { describe, it, expect } from 'vitest';

import { FILE_SERVER_URL } from './general';
import { GlobalFilePath, LocalFilePath, Path } from './path';

describe('LocalFilePath', () => {
  it('derives computed fields and rejects extensionless notes', () => {
    const filePath = new LocalFilePath({ folder: 'docs', note: 'report.md' });

    expect(filePath.folder).toBe('docs');
    expect(filePath.note).toBe('report.md');
    expect(filePath.noteWithoutExtension).toBe('report');
    expect(filePath.noteExtension).toBe('md');
    expect(filePath.noteWithExtensionParam).toBe('report?ext=md');
    expect(filePath.toString()).toBe('docs/report.md');

    expect(() => new LocalFilePath({ folder: 'docs', note: 'report' })).toThrow(
      'Note must have an extension: report'
    );
  });

  it('builds note links with encoding and custom params', () => {
    const path = new LocalFilePath({
      folder: 'My Notes',
      note: 'Weekly summary.md',
    });

    const withoutPrefix = path.getLinkToNoteWithoutNotesPrefix({
      highlight: 'section 2',
    });
    expect(withoutPrefix).toBe(
      '/My Notes/Weekly%20summary?ext=md&highlight=section+2'
    );

    const withNotesPrefix = path.getLinkToNote({ highlight: 'section 2' });
    expect(withNotesPrefix).toBe(
      '/notes/My Notes/Weekly%20summary?ext=md&highlight=section+2'
    );
  });

  it('returns file server urls for the backing note', () => {
    const path = new LocalFilePath({ folder: 'docs', note: 'report.md' });
    expect(path.getFileUrl()).toBe(`${FILE_SERVER_URL}/notes/docs/report.md`);
  });
});

describe('Path helpers and GlobalFilePath', () => {
  it('distinguishes path types and mirrors global urls', () => {
    const global = new GlobalFilePath({
      url: 'https://cdn.example.com/image.png',
    });
    const local = new LocalFilePath({ folder: 'docs', note: 'report.md' });

    expect(global.toString()).toBe('https://cdn.example.com/image.png');
    expect(global.getFileUrl()).toBe('https://cdn.example.com/image.png');
    expect(global.equals(new GlobalFilePath({ url: global.url }))).toBe(true);
    expect(global.equals(new GlobalFilePath({ url: 'https://other' }))).toBe(
      false
    );

    expect(Path.isGlobalFilePath(global)).toBe(true);
    expect(Path.isLocalFilePath(global)).toBe(false);
    expect(Path.isLocalFilePath(local)).toBe(true);
    expect(Path.isGlobalFilePath(local)).toBe(false);
  });
});
