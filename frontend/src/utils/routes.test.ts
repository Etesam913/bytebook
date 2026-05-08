import '../test/setup';
import { describe, it, expect } from 'bun:test';
import { ROUTE_PATTERNS, routeUrls } from './routes';

describe('ROUTE_PATTERNS', () => {
  it('should have correct route pattern constants', () => {
    expect(ROUTE_PATTERNS.ROOT).toBe('/');
    expect(ROUTE_PATTERNS.SEARCH).toBe('/search/:searchQuery?/*');
    expect(ROUTE_PATTERNS.KERNELS).toBe('/kernels/:kernelName');
    expect(ROUTE_PATTERNS.KERNELS_WITH_FILES).toBe(
      '/kernels/:kernelName/:folder?/:note?'
    );
    expect(ROUTE_PATTERNS.SAVED_SEARCH).toBe('/saved-search/:searchQuery/*');
    expect(ROUTE_PATTERNS.NOTES).toBe('/notes/*');
    expect(ROUTE_PATTERNS.CATCH_ALL).toBe('*');
    expect(ROUTE_PATTERNS.NOT_FOUND_FALLBACK).toBe('/404');
  });
});

describe('routeUrls', () => {
  describe('root', () => {
    it('should return root route', () => {
      expect(routeUrls.root()).toBe('/');
    });
  });

  describe('search', () => {
    it('should build search route with encoded query', () => {
      expect(routeUrls.search('research')).toBe('/search/research/');
      expect(routeUrls.search('economics notes')).toBe(
        '/search/economics%20notes/'
      );
    });

    it('should encode special characters in search query', () => {
      expect(routeUrls.search('query & more')).toBe(
        '/search/query%20%26%20more/'
      );
    });

    it('should handle empty search query', () => {
      expect(routeUrls.search('')).toBe('/search/');
    });

    it('should build search route with an encoded file path', () => {
      expect(routeUrls.search('economics', 'notes/file.md')).toBe(
        '/search/economics/notes/file.md'
      );
    });
  });

  describe('kernel', () => {
    it('should build kernel route with encoded name', () => {
      expect(routeUrls.kernel('python')).toBe('/kernels/python');
      expect(routeUrls.kernel('javascript')).toBe('/kernels/javascript');
    });

    it('should encode special characters in kernel name', () => {
      expect(routeUrls.kernel('python 3')).toBe('/kernels/python%203');
      expect(routeUrls.kernel('node.js')).toBe('/kernels/node.js');
      expect(routeUrls.kernel('c++')).toBe('/kernels/c%2B%2B');
    });

    it('should handle empty kernel name', () => {
      expect(routeUrls.kernel('')).toBe('/kernels/');
    });
  });

  describe('folder', () => {
    it('should build folder route with encoded name', () => {
      expect(routeUrls.folder('Economics Notes')).toBe(
        '/notes/Economics%20Notes'
      );
      expect(routeUrls.folder('Research Notes')).toBe(
        '/notes/Research%20Notes'
      );
    });

    it('should encode special characters in folder name', () => {
      expect(routeUrls.folder('My Folder/Subfolder')).toBe(
        '/notes/My%20Folder%2FSubfolder'
      );
      expect(routeUrls.folder('Folder & More')).toBe(
        '/notes/Folder%20%26%20More'
      );
    });

    it('should handle empty folder name', () => {
      expect(routeUrls.folder('')).toBe('/notes/');
    });
  });

  describe('notFoundFallback', () => {
    it('should return 404 route', () => {
      expect(routeUrls.notFoundFallback()).toBe('/404');
    });
  });

  describe('tagSearch', () => {
    it('should build tag search route with # prefix', () => {
      expect(routeUrls.tagSearch('economics')).toBe(
        '/saved-search/%23economics/'
      );
      expect(routeUrls.tagSearch('research')).toBe(
        '/saved-search/%23research/'
      );
    });

    it('should encode special characters in tag name', () => {
      expect(routeUrls.tagSearch('tag name')).toBe(
        '/saved-search/%23tag%20name/'
      );
      expect(routeUrls.tagSearch('tag&more')).toBe(
        '/saved-search/%23tag%26more/'
      );
    });

    it('should handle empty tag name', () => {
      expect(routeUrls.tagSearch('')).toBe('/saved-search/%23/');
    });
  });

  describe('savedSearch', () => {
    it('should build saved search route with encoded query', () => {
      expect(routeUrls.savedSearch('research')).toBe('/saved-search/research/');
      expect(routeUrls.savedSearch('economics notes')).toBe(
        '/saved-search/economics%20notes/'
      );
    });

    it('should encode special characters in search query', () => {
      expect(routeUrls.savedSearch('query & more')).toBe(
        '/saved-search/query%20%26%20more/'
      );
      expect(routeUrls.savedSearch('tag:research')).toBe(
        '/saved-search/tag%3Aresearch/'
      );
    });

    it('should handle empty search query', () => {
      expect(routeUrls.savedSearch('')).toBe('/saved-search/');
    });

    it('should handle queries with # prefix (tags)', () => {
      expect(routeUrls.savedSearch('#economics')).toBe(
        '/saved-search/%23economics/'
      );
    });

    it('should build saved search route with an encoded file path', () => {
      expect(routeUrls.savedSearch('economics', 'notes/file.md')).toBe(
        '/saved-search/economics/notes/file.md'
      );
      expect(
        routeUrls.savedSearch('#tagged', 'My%20Folder/diagrams/image%20(1).png')
      ).toBe('/saved-search/%23tagged/My%20Folder/diagrams/image%20(1).png');
    });
  });
});
