import '../test/setup';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

type UseSearch = () => string;
const useSearchMock = mock<UseSearch>(() => '');

mock.module('wouter', () => ({
  useSearch: useSearchMock,
}));

const {
  useSearchParamsEntries,
  findClosestSidebarItemToNavigateTo,
  disableBackspaceNavigation,
} = await import('./routing');

beforeEach(() => {
  useSearchMock.mockReset();
});

describe('useSearchParamsEntries', () => {
  it('returns URL params as a record', () => {
    useSearchMock.mockReturnValue('?note=123&view=grid');

    const { result } = renderHook(() => useSearchParamsEntries());

    expect(result.current).toEqual({ note: '123', view: 'grid' });
  });
});

describe('findClosestSidebarItemToNavigateTo', () => {
  it('prefers the left neighbor when available and falls back to index 0', () => {
    const oldItems = ['a', 'b', 'c', 'd'];
    const newItems = ['a', 'c', 'd'];

    expect(findClosestSidebarItemToNavigateTo('b', oldItems, newItems)).toBe(0);

    expect(findClosestSidebarItemToNavigateTo('z', oldItems, newItems)).toBe(0);
  });
});

describe('disableBackspaceNavigation', () => {
  it('prevents navigating back when focus is outside editable fields', () => {
    disableBackspaceNavigation();

    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const preventDefaultSpy = spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('lets editable elements handle backspace normally', () => {
    disableBackspaceNavigation();

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const preventDefaultSpy = spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
