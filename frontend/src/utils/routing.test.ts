import '@/test/setup';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';

const { disableBackspaceNavigation } = await import('./routing');

describe('disableBackspaceNavigation', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

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

  it('lets inputs inside shadow DOM handle backspace normally', () => {
    disableBackspaceNavigation();

    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const input = document.createElement('input');
    shadowRoot.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const preventDefaultSpy = spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
