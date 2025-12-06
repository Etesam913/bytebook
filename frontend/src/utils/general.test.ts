import { describe, it, expect } from 'bun:test';
import { humanFileSize } from './general';

describe('humanFileSize', () => {
  it('should format bytes correctly', () => {
    expect(humanFileSize(0)).toBe('0 B');
    expect(humanFileSize(500)).toBe('500 B');
    expect(humanFileSize(1024)).toBe('1.0 KiB');
    expect(humanFileSize(1536)).toBe('1.5 KiB');
    expect(humanFileSize(1048576)).toBe('1.0 MiB');
  });

  it('should use SI units when specified', () => {
    expect(humanFileSize(1000, true)).toBe('1.0 kB');
    expect(humanFileSize(1000000, true)).toBe('1.0 MB');
  });

  it('should respect decimal places parameter', () => {
    expect(humanFileSize(1536, false, 0)).toBe('2 KiB');
    expect(humanFileSize(1536, false, 2)).toBe('1.50 KiB');
  });
});
