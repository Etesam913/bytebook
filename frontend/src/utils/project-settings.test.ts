import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  validateProjectSettings,
  validateEditorFontSize,
  validateEditorLineHeight,
  validateCodeBlockFontSize,
  validateCodeBlockDefaultLanguage,
  DEFAULT_EDITOR_FONT_SIZE,
  MIN_EDITOR_FONT_SIZE,
  MAX_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LINE_HEIGHT,
  MIN_EDITOR_LINE_HEIGHT,
  MAX_EDITOR_LINE_HEIGHT,
  DEFAULT_CODE_BLOCK_FONT_SIZE,
  MIN_CODE_BLOCK_FONT_SIZE,
  MAX_CODE_BLOCK_FONT_SIZE,
  DEFAULT_CODE_BLOCK_LANGUAGE,
} from './project-settings';

describe('validateProjectSettings', () => {
  it('passes through fully valid settings', () => {
    expect(
      validateProjectSettings({ theme: 'dark', noteWidth: 'fullWidth' })
    ).toEqual({ theme: 'dark', noteWidth: 'fullWidth' });
    expect(
      validateProjectSettings({ theme: 'light', noteWidth: 'readability' })
    ).toEqual({ theme: 'light', noteWidth: 'readability' });
    expect(
      validateProjectSettings({ theme: 'system', noteWidth: 'readability' })
    ).toEqual({ theme: 'system', noteWidth: 'readability' });
  });

  it('falls back to "system" theme when the value is unrecognized', () => {
    expect(
      validateProjectSettings({ theme: 'sepia', noteWidth: 'fullWidth' }).theme
    ).toBe('system');
  });

  it('falls back to "readability" noteWidth when the value is unrecognized', () => {
    expect(
      validateProjectSettings({ theme: 'dark', noteWidth: 'wide' }).noteWidth
    ).toBe('readability');
  });

  it('uses both defaults when both values are invalid', () => {
    expect(validateProjectSettings({ theme: '', noteWidth: '' })).toEqual({
      theme: 'system',
      noteWidth: 'readability',
    });
  });

  it('does not mutate the input object', () => {
    const input = { theme: 'sepia', noteWidth: 'wide' };
    validateProjectSettings(input);
    expect(input).toEqual({ theme: 'sepia', noteWidth: 'wide' });
  });
});

describe('validateEditorFontSize', () => {
  it('exposes the expected constants', () => {
    expect(DEFAULT_EDITOR_FONT_SIZE).toBe(14);
    expect(MIN_EDITOR_FONT_SIZE).toBe(8);
    expect(MAX_EDITOR_FONT_SIZE).toBe(24);
  });

  it('returns in-range numbers unchanged', () => {
    expect(validateEditorFontSize(8)).toBe(8);
    expect(validateEditorFontSize(14)).toBe(14);
    expect(validateEditorFontSize(24)).toBe(24);
    expect(validateEditorFontSize(16)).toBe(16);
  });

  it('rounds fractional sizes to the nearest integer', () => {
    expect(validateEditorFontSize(16.4)).toBe(16);
    expect(validateEditorFontSize(16.7)).toBe(17);
    expect(validateEditorFontSize(15.5)).toBe(16);
  });

  it('clamps below the minimum to MIN_EDITOR_FONT_SIZE', () => {
    expect(validateEditorFontSize(0)).toBe(MIN_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize(-100)).toBe(MIN_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize(7.4)).toBe(MIN_EDITOR_FONT_SIZE);
  });

  it('clamps above the maximum to MAX_EDITOR_FONT_SIZE', () => {
    expect(validateEditorFontSize(100)).toBe(MAX_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize(24.6)).toBe(MAX_EDITOR_FONT_SIZE);
  });

  it('returns the default for non-number inputs', () => {
    expect(validateEditorFontSize('14')).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize(null)).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize(undefined)).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize({})).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize([])).toBe(DEFAULT_EDITOR_FONT_SIZE);
  });

  it('returns the default for NaN and Infinity (Number.isFinite check)', () => {
    expect(validateEditorFontSize(Number.NaN)).toBe(DEFAULT_EDITOR_FONT_SIZE);
    expect(validateEditorFontSize(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_EDITOR_FONT_SIZE
    );
    expect(validateEditorFontSize(Number.NEGATIVE_INFINITY)).toBe(
      DEFAULT_EDITOR_FONT_SIZE
    );
  });
});

describe('validateEditorLineHeight', () => {
  it('accepts values within range and rounds to one decimal place', () => {
    expect(validateEditorLineHeight(2)).toBe(2);
    expect(validateEditorLineHeight(1.75)).toBe(1.8);
    expect(validateEditorLineHeight(2.34)).toBe(2.3);
  });

  it('clamps to the allowed range', () => {
    expect(validateEditorLineHeight(0.5)).toBe(MIN_EDITOR_LINE_HEIGHT);
    expect(validateEditorLineHeight(-3)).toBe(MIN_EDITOR_LINE_HEIGHT);
    expect(validateEditorLineHeight(10)).toBe(MAX_EDITOR_LINE_HEIGHT);
  });

  it('returns the default for invalid inputs', () => {
    expect(validateEditorLineHeight('2')).toBe(DEFAULT_EDITOR_LINE_HEIGHT);
    expect(validateEditorLineHeight(null)).toBe(DEFAULT_EDITOR_LINE_HEIGHT);
    expect(validateEditorLineHeight(undefined)).toBe(
      DEFAULT_EDITOR_LINE_HEIGHT
    );
    expect(validateEditorLineHeight(Number.NaN)).toBe(
      DEFAULT_EDITOR_LINE_HEIGHT
    );
    expect(validateEditorLineHeight(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_EDITOR_LINE_HEIGHT
    );
  });
});

describe('validateCodeBlockFontSize', () => {
  it('accepts and rounds values within range', () => {
    expect(validateCodeBlockFontSize(13)).toBe(13);
    expect(validateCodeBlockFontSize(15.6)).toBe(16);
  });

  it('clamps to the allowed range', () => {
    expect(validateCodeBlockFontSize(1)).toBe(MIN_CODE_BLOCK_FONT_SIZE);
    expect(validateCodeBlockFontSize(100)).toBe(MAX_CODE_BLOCK_FONT_SIZE);
  });

  it('returns the default for invalid inputs', () => {
    expect(validateCodeBlockFontSize('13')).toBe(DEFAULT_CODE_BLOCK_FONT_SIZE);
    expect(validateCodeBlockFontSize(undefined)).toBe(
      DEFAULT_CODE_BLOCK_FONT_SIZE
    );
    expect(validateCodeBlockFontSize(Number.NaN)).toBe(
      DEFAULT_CODE_BLOCK_FONT_SIZE
    );
  });
});

describe('validateCodeBlockDefaultLanguage', () => {
  it('passes through supported languages', () => {
    expect(validateCodeBlockDefaultLanguage('python')).toBe('python');
    expect(validateCodeBlockDefaultLanguage('go')).toBe('go');
    expect(validateCodeBlockDefaultLanguage('javascript')).toBe('javascript');
    expect(validateCodeBlockDefaultLanguage('java')).toBe('java');
    expect(validateCodeBlockDefaultLanguage('text')).toBe('text');
  });

  it('falls back to the default for unsupported values', () => {
    expect(validateCodeBlockDefaultLanguage('rust')).toBe(
      DEFAULT_CODE_BLOCK_LANGUAGE
    );
    expect(validateCodeBlockDefaultLanguage('')).toBe(
      DEFAULT_CODE_BLOCK_LANGUAGE
    );
    expect(validateCodeBlockDefaultLanguage(undefined)).toBe(
      DEFAULT_CODE_BLOCK_LANGUAGE
    );
    expect(validateCodeBlockDefaultLanguage(42)).toBe(
      DEFAULT_CODE_BLOCK_LANGUAGE
    );
  });
});
