import '../test/setup';
import { describe, it, expect } from 'bun:test';
import { throttle } from './draggable';

describe('throttle', () => {
  it('fires the first call synchronously and immediately', () => {
    let calls = 0;
    const throttled = throttle(() => calls++, 50);
    throttled();
    expect(calls).toBe(1);
  });

  it('suppresses additional calls during the throttle window', () => {
    let calls = 0;
    const throttled = throttle(() => calls++, 60);
    throttled();
    throttled();
    throttled();
    expect(calls).toBe(1);
  });

  it('schedules a trailing call after the wait elapses', async () => {
    let calls = 0;
    const throttled = throttle(() => calls++, 40);
    throttled(); // immediate
    throttled(); // queued
    await Bun.sleep(120);
    expect(calls).toBe(2);
  });

  it('uses the latest args for the trailing call', async () => {
    const received: number[] = [];
    const throttled = throttle((n: number) => received.push(n), 40);
    throttled(1); // fires immediately with 1
    throttled(2); // queued
    throttled(3); // overwrites the queued args
    await Bun.sleep(120);
    expect(received).toEqual([1, 3]);
  });

  it('returns the leading call result synchronously', () => {
    const throttled = throttle((n: number) => n * 2, 50);
    expect(throttled(5)).toBe(10);
  });
});
