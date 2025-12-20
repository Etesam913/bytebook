import '../../../test/setup';
import { describe, it, expect } from 'bun:test';
import { timeSince } from './bottom-bar';

const BASE = new Date(0);

describe('timeSince', () => {
  it('returns the largest readable unit for long spans (e.g. years)', () => {
    const later = new Date(BASE.getTime() + 2 * 31536000 * 1000);
    expect(timeSince(BASE, later)).toBe('2 years');
  });

  it('singularizes the unit label when the interval equals exactly one', () => {
    const later = new Date(BASE.getTime() + 2592000 * 1000);
    expect(timeSince(BASE, later)).toBe('1 month');
  });

  it('falls back to seconds when the gap is below one minute', () => {
    const later = new Date(BASE.getTime() + 45 * 1000);
    expect(timeSince(BASE, later)).toBe('45 seconds');
  });
});
