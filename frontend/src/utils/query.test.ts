import '../test/setup';
import { describe, it, expect } from 'bun:test';
import { QueryError } from './query';

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
