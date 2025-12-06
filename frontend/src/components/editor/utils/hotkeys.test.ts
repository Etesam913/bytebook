import { FORMAT_TEXT_COMMAND } from 'lexical';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleKeyboardShortcuts } from './hotkeys';

describe('handleKeyboardShortcuts', () => {
  const mockDispatchCommand = vi.fn();
  const mockEditor = {
    dispatchCommand: mockDispatchCommand,
  } as unknown as Parameters<typeof handleKeyboardShortcuts>[1];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createKeyboardEvent(
    options: Partial<KeyboardEvent> & { key: string }
  ): KeyboardEvent {
    const event = new KeyboardEvent('keydown', options);
    vi.spyOn(event, 'preventDefault');
    return event;
  }

  it('triggers strikethrough on cmd+shift+x', () => {
    const event = createKeyboardEvent({
      key: 'x',
      metaKey: true,
      shiftKey: true,
    });

    const result = handleKeyboardShortcuts(event, mockEditor);

    expect(result).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockDispatchCommand).toHaveBeenCalledWith(
      FORMAT_TEXT_COMMAND,
      'strikethrough'
    );
  });

  it('returns false for unhandled key combinations', () => {
    const event = createKeyboardEvent({
      key: 'x',
      metaKey: true,
      shiftKey: false,
    });

    const result = handleKeyboardShortcuts(event, mockEditor);

    expect(result).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockDispatchCommand).not.toHaveBeenCalled();
  });
});
