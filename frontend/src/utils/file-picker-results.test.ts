import { describe, expect, it } from 'bun:test';
import { createFilePath, createFolderPath } from './path';
import {
  excludeCurrentFile,
  getRecentPickerFiles,
} from './file-picker-results';

describe('file picker results', () => {
  it('keeps backend order while excluding the current file', () => {
    const results = ['z.md', 'current.md', 'a.md'].map((path) => ({
      filePath: createFilePath(path)!,
    }));

    const visible = excludeCurrentFile(results, 'current.md');

    expect(visible.map((result) => result.filePath.fullPath)).toEqual([
      'z.md',
      'a.md',
    ]);
  });

  it('uses existing recent files without folders or the current file', () => {
    const recent = [
      createFilePath('z.md')!,
      createFolderPath('folder/')!,
      createFilePath('missing.md')!,
      createFilePath('current.md')!,
    ];

    const visible = getRecentPickerFiles({
      recent,
      currentPath: 'current.md',
      allPaths: ['z.md', 'folder/', 'current.md'],
    });

    expect(visible.map((file) => file.fullPath)).toEqual(['z.md']);
  });

  it('keeps recents usable before the canonical snapshot loads', () => {
    const recent = [createFilePath('z.md')!];

    const visible = getRecentPickerFiles({
      recent,
      currentPath: undefined,
      allPaths: undefined,
    });

    expect(visible).toEqual(recent);
  });
});
