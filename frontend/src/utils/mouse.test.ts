import '../test/setup';
import { describe, it, expect } from 'bun:test';
import {
  isRegularMouseClick,
  shouldHandleOutsideSelectionInteraction,
} from './mouse';

const baseClick = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

describe('isRegularMouseClick', () => {
  it('returns true for a plain primary-button click', () => {
    expect(isRegularMouseClick(baseClick)).toBe(true);
  });

  it('returns false for non-primary buttons', () => {
    expect(isRegularMouseClick({ ...baseClick, button: 1 })).toBe(false);
    expect(isRegularMouseClick({ ...baseClick, button: 2 })).toBe(false);
  });

  it('returns false when any modifier key is pressed', () => {
    expect(isRegularMouseClick({ ...baseClick, metaKey: true })).toBe(false);
    expect(isRegularMouseClick({ ...baseClick, ctrlKey: true })).toBe(false);
    expect(isRegularMouseClick({ ...baseClick, shiftKey: true })).toBe(false);
    expect(isRegularMouseClick({ ...baseClick, altKey: true })).toBe(false);
  });
});

describe('shouldHandleOutsideSelectionInteraction', () => {
  it('returns true for a plain MouseEvent', () => {
    const event = new MouseEvent('mousedown', { button: 0 });
    expect(shouldHandleOutsideSelectionInteraction(event)).toBe(true);
  });

  it('returns false for a MouseEvent with modifier keys', () => {
    const event = new MouseEvent('mousedown', { button: 0, shiftKey: true });
    expect(shouldHandleOutsideSelectionInteraction(event)).toBe(false);
  });

  it('returns false for a MouseEvent with a non-primary button', () => {
    const event = new MouseEvent('mousedown', { button: 2 });
    expect(shouldHandleOutsideSelectionInteraction(event)).toBe(false);
  });

  it('returns false for a KeyboardEvent', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    expect(shouldHandleOutsideSelectionInteraction(event)).toBe(false);
  });
});
