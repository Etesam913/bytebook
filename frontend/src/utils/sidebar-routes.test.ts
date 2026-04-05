import '../test/setup';
import { describe, expect, it } from 'bun:test';
import { isSearchSidebarRoute } from './sidebar-routes';

describe('sidebar-routes', () => {
  describe('isSearchSidebarRoute', () => {
    it('detects only /search routes', () => {
      expect(isSearchSidebarRoute('/search/query/')).toBe(true);
      expect(isSearchSidebarRoute('/search/')).toBe(true);
      expect(isSearchSidebarRoute('/notes/folder/file.md')).toBe(false);
      expect(isSearchSidebarRoute('/saved-search/query/')).toBe(false);
    });
  });
});
