import '../test/setup';
import { afterEach, describe, expect, it } from 'bun:test';
import { installWailsDragHandlers } from './wails-drag';

type DragHandlers = Parameters<typeof installWailsDragHandlers>[0];
const runtimeWindow = window as unknown as {
  _wails?: {
    handleDragEnter?: () => void;
    handleDragOver?: (x: number, y: number) => void;
    handleDragLeave?: () => void;
    handlePlatformFileDrop?: (
      filenames: string[],
      x: number,
      y: number
    ) => void;
  };
};
const originalGlobals = runtimeWindow._wails;
const cleanups: (() => void)[] = [];

function register(handlers: DragHandlers) {
  const cleanup = installWailsDragHandlers(handlers);
  if (!cleanup) throw new Error('Expected Wails globals');
  cleanups.push(cleanup);
  return cleanup;
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  runtimeWindow._wails = originalGlobals;
});

describe('installWailsDragHandlers', () => {
  it.each(['first', 'second'] as const)(
    'keeps the other subscriber active after removing the %s subscriber',
    (removed) => {
      const calls: string[] = [];
      const subscribe = (name: string) =>
        register({
          onDragEnter: () => calls.push(`${name} enter`),
          onDragOver: (x, y) => calls.push(`${name} over ${x},${y}`),
          onDragLeave: () => calls.push(`${name} leave`),
          onPlatformFileDrop: (files, x, y) =>
            calls.push(`${name} drop ${files.join(',')} ${x},${y}`),
        });
      const globals = {
        handleDragEnter: () => calls.push('native enter'),
        handleDragOver: (x: number, y: number) =>
          calls.push(`native over ${x},${y}`),
        handleDragLeave: () => calls.push('native leave'),
        handlePlatformFileDrop: (files: string[], x: number, y: number) =>
          calls.push(`native drop ${files.join(',')} ${x},${y}`),
      };
      runtimeWindow._wails = globals;
      const first = subscribe('first');
      const second = subscribe('second');
      const cleanup = removed === 'first' ? first : second;
      const remaining = removed === 'first' ? 'second' : 'first';

      cleanup();
      cleanup();
      globals.handleDragEnter();
      globals.handleDragOver(10, 20);
      globals.handleDragLeave();
      globals.handlePlatformFileDrop(['note.md'], 30, 40);

      expect(calls).toEqual([
        'native enter',
        `${remaining} enter`,
        'native over 10,20',
        `${remaining} over 10,20`,
        'native leave',
        `${remaining} leave`,
        `${remaining} drop note.md 30,40`,
        'native drop note.md 30,40',
      ]);
    }
  );

  it('restores native handlers after final cleanup and supports reinstalling', () => {
    const nativeEnter = () => {};
    const globals = { handleDragEnter: nativeEnter };
    runtimeWindow._wails = globals;
    const first = register({ onDragEnter: () => {} });
    const second = register({ onDragEnter: () => {} });
    first();
    second();
    const restoredEnter = globals.handleDragEnter;
    const calls: string[] = [];
    const third = register({ onDragEnter: () => calls.push('third') });

    first();
    globals.handleDragEnter();
    third();

    expect(restoredEnter).toBe(nativeEnter);
    expect(calls).toEqual(['third']);
    expect(globals.handleDragEnter).toBe(nativeEnter);
  });

  it('returns null outside the Wails runtime', () => {
    delete runtimeWindow._wails;

    const cleanup = installWailsDragHandlers({ onDragEnter: () => {} });

    expect(cleanup).toBeNull();
  });
});
