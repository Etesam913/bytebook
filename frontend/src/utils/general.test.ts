import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  WAILS_URL,
  DEFAULT_SONNER_OPTIONS,
  MAX_SIDEBAR_WIDTH,
} from './general';

describe('constants', () => {
  it('WAILS_URL is "wails:"', () => {
    expect(WAILS_URL).toBe('wails:');
  });

  it('DEFAULT_SONNER_OPTIONS has the documented shape', () => {
    expect(DEFAULT_SONNER_OPTIONS).toEqual({
      dismissible: true,
      duration: 4000,
      closeButton: true,
    });
  });

  it('MAX_SIDEBAR_WIDTH is 500', () => {
    expect(MAX_SIDEBAR_WIDTH).toBe(500);
  });
});
