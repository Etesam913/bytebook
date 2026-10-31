import '../../test/setup';
import { afterEach, describe, expect, it } from 'bun:test';
import { Provider, createStore } from 'jotai';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { isFileMaximizedAtom } from '@/atoms';
import { NotFound } from './index';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('NotFound', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const store = createStore();

  afterEach(() => {
    act(() => root.render(null));
  });

  it('identifies missing folders and keeps the sidebar visible', () => {
    store.set(isFileMaximizedAtom, true);
    act(() =>
      root.render(
        <Provider store={store}>
          <NotFound kind="folder" />
        </Provider>
      )
    );

    expect(container.textContent).toContain('this folder does not exist');
    expect(store.get(isFileMaximizedAtom)).toBe(false);
    act(() => store.set(isFileMaximizedAtom, true));
    expect(store.get(isFileMaximizedAtom)).toBe(false);
  });
});
