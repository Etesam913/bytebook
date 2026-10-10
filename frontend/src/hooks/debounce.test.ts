import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import { createDebounced } from './debounce';

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
