import { beforeEach, describe, expect, it } from 'bun:test';
import { resolveDropTargetFolder } from './model-utils';
import type { FileTree as PierreFileTree } from '@pierre/trees';

describe('resolveDropTargetFolder', () => {
  const shadowHost = document.createElement('div');
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  const mockModel = {
    getFileTreeContainer: () => shadowHost,
  } as unknown as PierreFileTree;

  beforeEach(() => {
    shadowRoot.replaceChildren();
    shadowRoot.elementFromPoint = () => null;
  });

  it('returns empty string when model is null, container is null, or shadow root is null', () => {
    expect(resolveDropTargetFolder({ model: null, x: 10, y: 20 })).toBe('');

    const mockModelNoContainer = {
      getFileTreeContainer: () => null,
    } as unknown as PierreFileTree;
    expect(
      resolveDropTargetFolder({ model: mockModelNoContainer, x: 10, y: 20 })
    ).toBe('');
  });

  it('returns empty string when drop coordinates hit empty space in the file tree', () => {
    shadowRoot.elementFromPoint = () => null;
    expect(resolveDropTargetFolder({ model: mockModel, x: 50, y: 50 })).toBe(
      ''
    );
  });

  it('resolves folder path when dropped directly on a folder item', () => {
    const row = document.createElement('button');
    row.setAttribute('data-type', 'item');
    row.setAttribute('data-item-type', 'folder');
    row.setAttribute('data-item-path', 'projects/work/');

    shadowRoot.appendChild(row);
    shadowRoot.elementFromPoint = () => row;

    expect(resolveDropTargetFolder({ model: mockModel, x: 50, y: 50 })).toBe(
      'projects/work/'
    );
  });

  it('resolves parent folder path using data-item-parent-path when dropped on a file item', () => {
    const row = document.createElement('button');
    row.setAttribute('data-type', 'item');
    row.setAttribute('data-item-type', 'file');
    row.setAttribute('data-item-path', 'projects/work/meeting.md');
    row.setAttribute('data-item-parent-path', 'projects/work/');

    shadowRoot.appendChild(row);
    shadowRoot.elementFromPoint = () => row;

    expect(resolveDropTargetFolder({ model: mockModel, x: 50, y: 50 })).toBe(
      'projects/work/'
    );
  });

  it('resolves parent folder from file path when data-item-parent-path is not set', () => {
    const row = document.createElement('button');
    row.setAttribute('data-type', 'item');
    row.setAttribute('data-item-type', 'file');
    row.setAttribute('data-item-path', 'notes/daily.md');

    shadowRoot.appendChild(row);
    shadowRoot.elementFromPoint = () => row;

    expect(resolveDropTargetFolder({ model: mockModel, x: 50, y: 50 })).toBe(
      'notes/'
    );
  });

  it('resolves to empty string when a root-level file without parent path is hit', () => {
    const row = document.createElement('button');
    row.setAttribute('data-type', 'item');
    row.setAttribute('data-item-type', 'file');
    row.setAttribute('data-item-path', 'root-note.md');

    shadowRoot.appendChild(row);
    shadowRoot.elementFromPoint = () => row;

    expect(resolveDropTargetFolder({ model: mockModel, x: 50, y: 50 })).toBe(
      ''
    );
  });
});
