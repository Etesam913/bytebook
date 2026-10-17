import '@/test/setup';
import { describe, expect, it } from 'bun:test';
import { buildFileTreeDragPayload } from '@components/virtualized/virtualized-file-tree/model/drag';
import { parseDraggedFile } from './parse-dragged-file';

describe('parseDraggedFile', () => {
  it.each([
    { path: 'v1.0/', title: 'v1.0', url: 'wails:/notes/v1.0' },
    {
      path: 'projects/release, notes/',
      title: 'release, notes',
      url: 'wails:/notes/projects/release%2C%20notes',
    },
  ])('recognizes $path as a folder', ({ path, title, url }) => {
    const payload = buildFileTreeDragPayload([path]);

    const result = parseDraggedFile(payload);

    expect(result).toEqual({ type: 'folder', title, url });
  });

  it.each([
    {
      path: 'notes/draft.md',
      title: 'draft',
      url: 'wails:/notes/notes/draft.md',
    },
    {
      path: 'notes/draft, final.md',
      title: 'draft, final',
      url: 'wails:/notes/notes/draft%2C%20final.md',
    },
  ])('recognizes $path as a Markdown link', ({ path, title, url }) => {
    const payload = buildFileTreeDragPayload([path]);

    const result = parseDraggedFile(payload);

    expect(result).toEqual({ type: 'markdown', title, url });
  });

  it.each([
    { path: 'Makefile', extension: '' },
    { path: 'media/photo.png', extension: 'png' },
    { path: 'media/photo, final.png', extension: 'png' },
  ])('recognizes $path as a file', ({ path, extension }) => {
    const payload = buildFileTreeDragPayload([path]);

    const result = parseDraggedFile(payload);

    expect(result).toMatchObject({
      type: 'file',
      filePath: { fullPath: path, extension, fileUrl: `/notes/${path}` },
    });
  });

  it('keeps comma-containing names intact when splitting a multi-item payload', () => {
    const payload = buildFileTreeDragPayload([
      'v1.0, drafts/',
      'draft, final.md',
      'photo, final.png',
    ]);

    const results = payload.split(',').map(parseDraggedFile);

    expect(results).toMatchObject([
      {
        type: 'folder',
        title: 'v1.0, drafts',
        url: 'wails:/notes/v1.0%2C%20drafts',
      },
      {
        type: 'markdown',
        title: 'draft, final',
        url: 'wails:/notes/draft%2C%20final.md',
      },
      {
        type: 'file',
        filePath: { fullPath: 'photo, final.png', extension: 'png' },
      },
    ]);
  });
});
