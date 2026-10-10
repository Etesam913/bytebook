import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import { createDebounced, throttle } from './timing';

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

describe('createDebounced', () => {
  it('calls the fn once for a burst of calls', async () => {
    let calls = 0;
    const debounced = createDebounced(() => calls++, 30);
    debounced();
    debounced();
    debounced();
    await Bun.sleep(80);
    expect(calls).toBe(1);
  });

  it('does not invoke the fn before the wait elapses', async () => {
    let calls = 0;
    const debounced = createDebounced(() => calls++, 60);
    debounced();
    await Bun.sleep(20);
    expect(calls).toBe(0);
    await Bun.sleep(80);
    expect(calls).toBe(1);
  });

  it('passes the latest args to the fn', async () => {
    const received: number[] = [];
    const debounced = createDebounced((n: number) => received.push(n), 30);
    debounced(1);
    debounced(2);
    debounced(3);
    await Bun.sleep(80);
    expect(received).toEqual([3]);
  });

  it('fires again after a quiet period', async () => {
    let calls = 0;
    const debounced = createDebounced(() => calls++, 30);
    debounced();
    await Bun.sleep(80);
    debounced();
    await Bun.sleep(80);
    expect(calls).toBe(2);
  });

  it('flush runs the pending call immediately and only once', async () => {
    const received: number[] = [];
    const debounced = createDebounced((n: number) => received.push(n), 500);
    debounced(1);
    debounced(2);
    debounced.flush();
    expect(received).toEqual([2]);
    debounced.flush();
    await Bun.sleep(550);
    expect(received).toEqual([2]);
  });

  it('flush is a no-op when nothing is pending', () => {
    let calls = 0;
    const debounced = createDebounced(() => calls++, 30);
    debounced.flush();
    expect(calls).toBe(0);
  });

  it('cancel drops the pending call', async () => {
    let calls = 0;
    const debounced = createDebounced(() => calls++, 30);
    debounced();
    debounced.cancel();
    await Bun.sleep(80);
    expect(calls).toBe(0);
  });

  it('setFn redirects pending and future calls to the new fn', async () => {
    const received: string[] = [];
    const debounced = createDebounced(
      (s: string) => received.push(`a:${s}`),
      30
    );
    debounced('x');
    debounced.setFn((s: string) => received.push(`b:${s}`));
    await Bun.sleep(80);
    expect(received).toEqual(['b:x']);
  });
});
