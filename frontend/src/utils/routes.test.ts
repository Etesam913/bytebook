import { describe, it, expect } from 'bun:test';
import { ROUTE_PATTERNS, routeBuilders } from './routes';

describe('ROUTE_PATTERNS', () => {
  it('should have correct route pattern constants', () => {
    expect(ROUTE_PATTERNS.ROOT).toBe('/');
    expect(ROUTE_PATTERNS.SEARCH).toBe('/search');
    expect(ROUTE_PATTERNS.KERNELS).toBe('/kernels/:kernelName');
    expect(ROUTE_PATTERNS.KERNELS_WITH_FILES).toBe(
      '/kernels/:kernelName/:folder?/:note?'
    );
    expect(ROUTE_PATTERNS.SAVED_SEARCH).toBe(
      '/saved-search/:searchQuery/:folder?/:note?'
    );
    expect(ROUTE_PATTERNS.NOTES).toBe('/notes/:folder/:note?');
    expect(ROUTE_PATTERNS.CATCH_ALL).toBe('*');
    expect(ROUTE_PATTERNS.NOT_FOUND_FALLBACK).toBe('/404');
  });
});

describe('routeBuilders', () => {
  describe('root', () => {
    it('should return root route', () => {
      expect(routeBuilders.root()).toBe('/');
    });
  });

  describe('search', () => {
    it('should return search route', () => {
      expect(routeBuilders.search()).toBe('/search');
    });
  });

  describe('kernel', () => {
    it('should build kernel route with encoded name', () => {
      expect(routeBuilders.kernel('python')).toBe('/kernels/python');
      expect(routeBuilders.kernel('javascript')).toBe('/kernels/javascript');
    });

    it('should encode special characters in kernel name', () => {
      expect(routeBuilders.kernel('python 3')).toBe('/kernels/python%203');
      expect(routeBuilders.kernel('node.js')).toBe('/kernels/node.js');
      expect(routeBuilders.kernel('c++')).toBe('/kernels/c%2B%2B');
    });

    it('should handle empty kernel name', () => {
      expect(routeBuilders.kernel('')).toBe('/kernels/');
    });
  });

  describe('folder', () => {
    it('should build folder route with encoded name', () => {
      expect(routeBuilders.folder('Economics Notes')).toBe(
        '/notes/Economics%20Notes'
      );
      expect(routeBuilders.folder('Research Notes')).toBe(
        '/notes/Research%20Notes'
      );
    });

    it('should encode special characters in folder name', () => {
      expect(routeBuilders.folder('My Folder/Subfolder')).toBe(
        '/notes/My%20Folder%2FSubfolder'
      );
      expect(routeBuilders.folder('Folder & More')).toBe(
        '/notes/Folder%20%26%20More'
      );
    });

    it('should handle empty folder name', () => {
      expect(routeBuilders.folder('')).toBe('/notes/');
    });
  });

  describe('note', () => {
    it('should build basic note route without options', () => {
      expect(
        routeBuilders.note('Economics Notes', 'Supply and Demand.md')
      ).toBe('/notes/Economics%20Notes/Supply and Demand.md');
    });

    it('should encode folder name but not file name', () => {
      expect(routeBuilders.note('My Folder', 'file name.md')).toBe(
        '/notes/My%20Folder/file name.md'
      );
    });

    it('should add ext query parameter when provided', () => {
      const result = routeBuilders.note('folder', 'file.md', { ext: '.py' });
      expect(result).toContain('/notes/folder/file.md');
      expect(result).toContain('ext=.py');
    });

    it('should add focus query parameter when true', () => {
      const result = routeBuilders.note('folder', 'file.md', { focus: true });
      expect(result).toContain('/notes/folder/file.md');
      expect(result).toContain('focus=true');
    });

    it('should add both ext and focus parameters when provided', () => {
      const result = routeBuilders.note('folder', 'file.md', {
        ext: '.py',
        focus: true,
      });
      expect(result).toContain('/notes/folder/file.md');
      expect(result).toContain('ext=.py');
      expect(result).toContain('focus=true');
    });

    it('should not add query string when focus is false', () => {
      const result = routeBuilders.note('folder', 'file.md', { focus: false });
      expect(result).toBe('/notes/folder/file.md');
    });

    it('should handle empty folder and file names', () => {
      expect(routeBuilders.note('', '')).toBe('/notes//');
    });
  });

  describe('noteWithFocus', () => {
    it('should preserve pathname and add ext and focus params', () => {
      const result = routeBuilders.noteWithFocus(
        '/notes/folder/file.md',
        '.py'
      );
      expect(result).toContain('/notes/folder/file.md');
      expect(result).toContain('ext=.py');
      expect(result).toContain('focus=true');
    });

    it('should preserve existing query parameters', () => {
      const result = routeBuilders.noteWithFocus(
        '/notes/folder/file.md?existing=param',
        '.py'
      );
      expect(result).toContain('/notes/folder/file.md');
      expect(result).toContain('existing=param');
      expect(result).toContain('ext=.py');
      expect(result).toContain('focus=true');
    });

    it('should override existing ext parameter', () => {
      const result = routeBuilders.noteWithFocus(
        '/notes/folder/file.md?ext=.js',
        '.py'
      );
      expect(result).toContain('ext=.py');
      expect(result).not.toContain('ext=.js');
    });

    it('should handle root path', () => {
      const result = routeBuilders.noteWithFocus('/', '.py');
      expect(result).toContain('/');
      expect(result).toContain('ext=.py');
      expect(result).toContain('focus=true');
    });
  });

  describe('notFoundFallback', () => {
    it('should return 404 route', () => {
      expect(routeBuilders.notFoundFallback()).toBe('/404');
    });
  });

  describe('tagSearch', () => {
    it('should build tag search route with # prefix', () => {
      expect(routeBuilders.tagSearch('economics')).toBe(
        '/saved-search/%23economics'
      );
      expect(routeBuilders.tagSearch('research')).toBe(
        '/saved-search/%23research'
      );
    });

    it('should encode special characters in tag name', () => {
      expect(routeBuilders.tagSearch('tag name')).toBe(
        '/saved-search/%23tag%20name'
      );
      expect(routeBuilders.tagSearch('tag&more')).toBe(
        '/saved-search/%23tag%26more'
      );
    });

    it('should handle empty tag name', () => {
      expect(routeBuilders.tagSearch('')).toBe('/saved-search/%23');
    });
  });

  describe('savedSearch', () => {
    it('should build saved search route with encoded query', () => {
      expect(routeBuilders.savedSearch('research')).toBe(
        '/saved-search/research'
      );
      expect(routeBuilders.savedSearch('economics notes')).toBe(
        '/saved-search/economics%20notes'
      );
    });

    it('should encode special characters in search query', () => {
      expect(routeBuilders.savedSearch('query & more')).toBe(
        '/saved-search/query%20%26%20more'
      );
      expect(routeBuilders.savedSearch('tag:research')).toBe(
        '/saved-search/tag%3Aresearch'
      );
    });

    it('should handle empty search query', () => {
      expect(routeBuilders.savedSearch('')).toBe('/saved-search/');
    });

    it('should handle queries with # prefix (tags)', () => {
      expect(routeBuilders.savedSearch('#economics')).toBe(
        '/saved-search/%23economics'
      );
    });
  });
});
