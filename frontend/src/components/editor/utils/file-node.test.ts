import { afterAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { getFileElementTypeFromExtensionAndHead } from './file-node';

const fetchMock = spyOn(globalThis, 'fetch');

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null));
});

afterAll(() => {
  fetchMock.mockRestore();
});

describe('getFileElementTypeFromExtensionAndHead', () => {
  it.each([
    { file: 'photo.png', type: 'image' },
    { file: 'photo.jpg', type: 'image' },
    { file: 'photo.jpeg', type: 'image' },
    { file: 'photo.webp', type: 'image' },
    { file: 'photo.gif', type: 'image' },
    { file: 'clip.mov', type: 'video' },
    { file: 'clip.mp4', type: 'video' },
    { file: 'clip.m4v', type: 'video' },
    { file: 'clip.webm', type: 'video' },
    { file: 'document.pdf', type: 'pdf' },
    { file: 'https://example.com/media/photo.png', type: 'image' },
  ])('detects $file as $type without a request', async ({ file, type }) => {
    const result = await getFileElementTypeFromExtensionAndHead(file);

    expect(result).toBe(type);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { contentType: 'image/png', type: 'image' },
    { contentType: 'video/mp4', type: 'video' },
    { contentType: 'text/html; charset=utf-8', type: 'unknown' },
    { contentType: 'application/pdf', type: 'unknown' },
    { contentType: null, type: 'unknown' },
  ])(
    'uses HEAD Content-Type $contentType to return $type',
    async ({ contentType, type }) => {
      const url = 'https://example.com/download?id=123';
      fetchMock.mockResolvedValue(
        new Response(null, {
          headers: contentType ? { 'Content-Type': contentType } : {},
        })
      );

      const result = await getFileElementTypeFromExtensionAndHead(url);

      expect(result).toBe(type);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(url, { method: 'HEAD' });
    }
  );

  it.each([
    'https://example.com/not-an-image.png.txt',
    'https://example.com/download',
  ])('falls back to HEAD for unrecognized input %s', async (url) => {
    const result = await getFileElementTypeFromExtensionAndHead(url);

    expect(result).toBe('unknown');
    expect(fetchMock).toHaveBeenCalledWith(url, { method: 'HEAD' });
  });

  it('returns unknown when the HEAD request rejects', async () => {
    const url = 'https://example.com/unavailable';
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await getFileElementTypeFromExtensionAndHead(url);

    expect(result).toBe('unknown');
    expect(fetchMock).toHaveBeenCalledWith(url, { method: 'HEAD' });
  });
});
