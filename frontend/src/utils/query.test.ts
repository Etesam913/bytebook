import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  QueryError,
  getBackendResponseData,
  requireBackendResponseData,
} from './query';

describe('QueryError', () => {
  it('is both an Error and a QueryError', () => {
    const err = new QueryError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(QueryError);
  });

  it('sets name to "QueryError"', () => {
    expect(new QueryError('x').name).toBe('QueryError');
  });

  it('preserves the constructor message', () => {
    expect(new QueryError('something went wrong').message).toBe(
      'something went wrong'
    );
  });

  it('captures a stack trace', () => {
    expect(new QueryError('x').stack).toBeDefined();
  });

  it('can be caught as a generic Error', () => {
    const fn = () => {
      throw new QueryError('caught me');
    };
    expect(fn).toThrow(Error);
    expect(fn).toThrow('caught me');
  });
});

describe('getBackendResponseData', () => {
  it('returns data on success', async () => {
    const data = await getBackendResponseData(
      Promise.resolve({ success: true, message: '', data: [1] })
    );
    expect(data).toEqual([1]);
  });

  it('returns undefined for responses without data', async () => {
    const data = await getBackendResponseData(
      Promise.resolve({ success: true, message: 'ok' })
    );
    expect(data).toBeUndefined();
  });

  it('throws a QueryError carrying the backend message', async () => {
    const err: unknown = await getBackendResponseData(
      Promise.resolve({ success: false, message: 'nope' })
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(QueryError);
    expect((err as Error).message).toBe('nope');
  });
});

describe('requireBackendResponseData', () => {
  it('throws when the backend succeeds without data', async () => {
    const err: unknown = await requireBackendResponseData(
      Promise.resolve({ success: true, message: 'empty' })
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(QueryError);
  });

  it('returns data on success', async () => {
    const data = await requireBackendResponseData(
      Promise.resolve({ success: true, message: '', data: 'x' })
    );
    expect(data).toBe('x');
  });
});
