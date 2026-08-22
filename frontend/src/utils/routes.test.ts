import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import { ROUTE_PATTERNS, routeUrls } from './routes';

describe('ROUTE_PATTERNS', () => {
  it('defines correct route pattern constants', () => {
    expect(ROUTE_PATTERNS.ROOT).toBe('/');
    expect(ROUTE_PATTERNS.KERNELS).toBe('/kernels/:kernelName');
    expect(ROUTE_PATTERNS.KERNELS_WITH_FILES).toBe(
      '/kernels/:kernelName/:folder?/:note?'
    );
    expect(ROUTE_PATTERNS.NOTES).toBe('/notes/*');
    expect(ROUTE_PATTERNS.CATCH_ALL).toBe('*');
    expect(ROUTE_PATTERNS.NOT_FOUND_FALLBACK).toBe('/404');
  });
});

describe('routeUrls', () => {
  describe('root', () => {
    it('returns root route', () => {
      expect(routeUrls.root()).toBe('/');
    });
  });

  describe('kernel', () => {
    it('builds kernel route with encoded name', () => {
      expect(routeUrls.kernel('python')).toBe('/kernels/python');
      expect(routeUrls.kernel('javascript')).toBe('/kernels/javascript');
    });

    it('encodes special characters in kernel name', () => {
      expect(routeUrls.kernel('python 3')).toBe('/kernels/python%203');
      expect(routeUrls.kernel('node.js')).toBe('/kernels/node.js');
      expect(routeUrls.kernel('c++')).toBe('/kernels/c%2B%2B');
    });

    it('handles empty kernel name', () => {
      expect(routeUrls.kernel('')).toBe('/kernels/');
    });
  });

  describe('folder', () => {
    it('builds folder route with encoded name', () => {
      expect(routeUrls.folder('Economics Notes')).toBe(
        '/notes/Economics%20Notes'
      );
      expect(routeUrls.folder('Research Notes')).toBe(
        '/notes/Research%20Notes'
      );
    });

    it('encodes special characters in folder name', () => {
      expect(routeUrls.folder('My Folder/Subfolder')).toBe(
        '/notes/My%20Folder%2FSubfolder'
      );
      expect(routeUrls.folder('Folder & More')).toBe(
        '/notes/Folder%20%26%20More'
      );
    });

    it('handles empty folder name', () => {
      expect(routeUrls.folder('')).toBe('/notes/');
    });
  });

  describe('notFoundFallback', () => {
    it('returns 404 route', () => {
      expect(routeUrls.notFoundFallback()).toBe('/404');
    });
  });
});
