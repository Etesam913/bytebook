import { describe, it, expect } from 'vitest';
import { validateProjectSettings } from './project-settings';

describe('validateProjectSettings', () => {
  it('returns validated settings when every option is valid', () => {
    const settings = {
      theme: 'dark',
      noteSidebarItemSize: 'list',
      noteWidth: 'fullWidth',
    } as const;

    expect(validateProjectSettings({ ...settings })).toEqual(settings);
  });

  it('falls back to defaults when options are invalid', () => {
    const result = validateProjectSettings({
      theme: 'blue' as string,
      noteSidebarItemSize: 'huge' as string,
      noteWidth: 'narrow' as string,
    });

    expect(result).toEqual({
      theme: 'system',
      noteSidebarItemSize: 'card',
      noteWidth: 'readability',
    });
  });

  it('only replaces the fields that fail validation', () => {
    const result = validateProjectSettings({
      theme: 'light',
      noteSidebarItemSize: 'huge' as string,
      noteWidth: 'readability',
    });

    expect(result).toEqual({
      theme: 'light',
      noteSidebarItemSize: 'card',
      noteWidth: 'readability',
    });
  });
});
