import { beforeEach, describe, expect, it } from 'bun:test';
import {
  clearDropTargetHighlight,
  resolveDropTargetFolder,
  updateDropTargetHighlight,
} from './model-utils';
import type { FileTree as PierreFileTree } from '@pierre/trees';

describe('file-tree drop resolver and highlights', () => {
  const shadowHost = document.createElement('div');
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  const mockModel = {
    getFileTreeContainer: () => shadowHost,
  } as unknown as PierreFileTree;

  function createRow(attrs: Record<string, string | undefined>) {
    const row = document.createElement('button');
    row.setAttribute('data-type', 'item');
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined) row.setAttribute(k, v);
    }
    return row;
  }

  beforeEach(() => {
    shadowRoot.replaceChildren();
    shadowRoot.elementFromPoint = () => null;
  });

  describe('resolveDropTargetFolder', () => {
    it('returns empty string when model, container, or hit element is null', () => {
      expect(resolveDropTargetFolder({ model: null, x: 10, y: 20 })).toBe('');

      const noContainer = {
        getFileTreeContainer: () => null,
      } as unknown as PierreFileTree;
      expect(
        resolveDropTargetFolder({ model: noContainer, x: 10, y: 20 })
      ).toBe('');
      expect(resolveDropTargetFolder({ model: mockModel, x: 50, y: 50 })).toBe(
        ''
      );
    });

    it.each([
      {
        label: 'dropped directly on a folder item',
        attrs: {
          'data-item-type': 'folder',
          'data-item-path': 'projects/work/',
        },
        expected: 'projects/work/',
      },
      {
        label: 'dropped on a file item with parent path',
        attrs: {
          'data-item-type': 'file',
          'data-item-path': 'projects/work/meeting.md',
          'data-item-parent-path': 'projects/work/',
        },
        expected: 'projects/work/',
      },
      {
        label: 'dropped on a nested file without parent path attribute',
        attrs: { 'data-item-type': 'file', 'data-item-path': 'notes/daily.md' },
        expected: 'notes/',
      },
      {
        label: 'dropped on a root file without parent path',
        attrs: { 'data-item-type': 'file', 'data-item-path': 'root-note.md' },
        expected: '',
      },
    ])('resolves destination when $label', ({ attrs, expected }) => {
      const row = createRow(attrs);
      shadowRoot.appendChild(row);
      shadowRoot.elementFromPoint = () => row;
      expect(resolveDropTargetFolder({ model: mockModel, x: 50, y: 50 })).toBe(
        expected
      );
    });
  });

  describe('drop target highlights', () => {
    it('updates, switches, and clears drop target highlights only for folders', () => {
      const folderA = createRow({
        'data-item-type': 'folder',
        'data-item-path': 'docs/',
      });
      const folderB = createRow({
        'data-item-type': 'folder',
        'data-item-path': 'notes/',
      });
      const fileRow = createRow({
        'data-item-type': 'file',
        'data-item-path': 'notes/todo.md',
      });
      shadowRoot.append(folderA, folderB, fileRow);

      // Initial highlight on folderA
      shadowRoot.elementFromPoint = () => folderA;
      updateDropTargetHighlight({ model: mockModel, x: 30, y: 30 });
      expect(folderA.getAttribute('data-external-drop-target')).toBe('true');

      // Hovering over file does not highlight file and clears folderA
      shadowRoot.elementFromPoint = () => fileRow;
      updateDropTargetHighlight({ model: mockModel, x: 30, y: 45 });
      expect(folderA.getAttribute('data-external-drop-target')).toBeNull();
      expect(fileRow.getAttribute('data-external-drop-target')).toBeNull();

      // Switch highlight to folderB
      shadowRoot.elementFromPoint = () => folderB;
      updateDropTargetHighlight({ model: mockModel, x: 30, y: 60 });
      expect(folderB.getAttribute('data-external-drop-target')).toBe('true');

      // Clear when moving over empty space
      shadowRoot.elementFromPoint = () => null;
      updateDropTargetHighlight({ model: mockModel, x: 30, y: 100 });
      expect(folderB.getAttribute('data-external-drop-target')).toBeNull();

      // Clear explicitly via clearDropTargetHighlight
      shadowRoot.elementFromPoint = () => folderA;
      updateDropTargetHighlight({ model: mockModel, x: 30, y: 30 });
      clearDropTargetHighlight(mockModel);
      expect(folderA.getAttribute('data-external-drop-target')).toBeNull();
    });
  });
});
