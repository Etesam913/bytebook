import '../test/setup';
import { describe, it, expect } from 'bun:test';
import {
  debounce,
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

describe('debounce', () => {
  it('calls the underlying fn only once for a burst of calls', async () => {
    let calls = 0;
    const debounced = debounce(() => calls++, 30);

    debounced();
    debounced();
    debounced();

    await Bun.sleep(80);
    expect(calls).toBe(1);
  });

  it('does not invoke the fn before the wait elapses', async () => {
    let calls = 0;
    const debounced = debounce(() => calls++, 60);
    debounced();
    await Bun.sleep(20);
    expect(calls).toBe(0);
    await Bun.sleep(80);
    expect(calls).toBe(1);
  });

  it('passes the latest args to the fn', async () => {
    const received: number[] = [];
    const debounced = debounce((n: number) => received.push(n), 30);
    debounced(1);
    debounced(2);
    debounced(3);
    await Bun.sleep(80);
    expect(received).toEqual([3]);
  });

  it('fires again after a quiet period', async () => {
    let calls = 0;
    const debounced = debounce(() => calls++, 30);
    debounced();
    await Bun.sleep(80);
    debounced();
    await Bun.sleep(80);
    expect(calls).toBe(2);
  });

  it('uses the default 300ms wait when no ms is passed', async () => {
    let calls = 0;
    const debounced = debounce(() => calls++);
    debounced();
    await Bun.sleep(50);
    expect(calls).toBe(0);
  });
});
