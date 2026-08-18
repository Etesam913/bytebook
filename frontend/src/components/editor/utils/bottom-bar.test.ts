import '../../../test/setup';
import { describe, it, expect } from 'bun:test';
import { timeSince } from './bottom-bar';

const BASE = new Date(0);

describe('timeSince', () => {
  it.each([
    [2 * 31536000 * 1000, '2 years'],
    [2592000 * 1000, '1 month'],
    [45 * 1000, '45 seconds'],
  ])('returns "%s" for delta of %d ms', (deltaMs, expected) => {
    const later = new Date(BASE.getTime() + deltaMs);
    expect(timeSince(BASE, later)).toBe(expected);
  });
});
