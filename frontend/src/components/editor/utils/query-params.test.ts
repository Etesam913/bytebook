import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import {
  getQueryParamValue,
  addQueryParam,
  removeQueryParam,
} from '@components/editor/utils/query-params';

describe('getQueryParamValue', () => {
  it('returns the value of a present query param', () => {
    expect(getQueryParamValue('https://example.com/x?foo=bar', 'foo')).toBe(
      'bar'
    );
  });

  it('returns null for a missing query param', () => {
    expect(
      getQueryParamValue('https://example.com/x?foo=bar', 'baz')
    ).toBeNull();
  });

  it('returns null when the URL has no query string', () => {
    expect(getQueryParamValue('https://example.com/x', 'foo')).toBeNull();
  });

  it('handles multiple params correctly', () => {
    const url = 'https://example.com/x?a=1&b=2&c=3';
    expect(getQueryParamValue(url, 'a')).toBe('1');
    expect(getQueryParamValue(url, 'b')).toBe('2');
    expect(getQueryParamValue(url, 'c')).toBe('3');
  });
});

describe('addQueryParam', () => {
  it('appends a new query string when none exists', () => {
    expect(addQueryParam('https://example.com/x', 'foo', 'bar')).toBe(
      'https://example.com/x?foo=bar'
    );
  });

  it('updates an existing key in place', () => {
    expect(addQueryParam('https://example.com/x?foo=old', 'foo', 'new')).toBe(
      'https://example.com/x?foo=new'
    );
  });

  it('appends a new key while preserving other params', () => {
    expect(addQueryParam('https://example.com/x?a=1', 'b', '2')).toBe(
      'https://example.com/x?a=1&b=2'
    );
  });
});

describe('removeQueryParam', () => {
  it('removes the target key while keeping other params', () => {
    expect(removeQueryParam('https://example.com/x?a=1&b=2', 'a')).toBe(
      'https://example.com/x?b=2'
    );
  });

  it('drops the leading "?" when the last param is removed', () => {
    expect(removeQueryParam('https://example.com/x?foo=bar', 'foo')).toBe(
      'https://example.com/x'
    );
  });

  it('is a no-op when the URL has no query string', () => {
    expect(removeQueryParam('https://example.com/x', 'foo')).toBe(
      'https://example.com/x'
    );
  });

  it('is a no-op when the key is absent', () => {
    expect(removeQueryParam('https://example.com/x?a=1', 'b')).toBe(
      'https://example.com/x?a=1'
    );
  });
});
