import '@/test/setup';
import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { toast } from 'sonner';
import { QueryError } from './query';

const copy =
  mock<
    (
      folder: string,
      paths: string[]
    ) => Promise<{ success: boolean; message: string; data?: string[] }>
  >();
void mock.module('@bindings/services/nodeservice', () => ({
  AddAttachmentsFromPaths: copy,
}));
const { importFilesToFolder } = await import('./import-files');
const loading = spyOn(toast, 'loading');
const success = spyOn(toast, 'success');
const dismiss = spyOn(toast, 'dismiss');

describe('importFilesToFolder', () => {
  beforeEach(() => {
    copy.mockReset();
    loading.mockReset();
    success.mockReset();
    dismiss.mockReset();
    loading.mockReturnValue('upload');
  });

  it('reports progress and completion for each copied file', async () => {
    copy.mockResolvedValueOnce({ success: true, message: '', data: ['a'] });
    copy.mockResolvedValueOnce({ success: true, message: '', data: ['b'] });

    const paths = await importFilesToFolder({
      folderPath: 'folder/',
      filePaths: ['/a', '/b'],
    });

    expect(paths).toEqual(['a', 'b']);
    expect(copy.mock.calls).toEqual([
      ['folder', ['/a']],
      ['folder', ['/b']],
    ]);
    expect(loading.mock.calls.map(([message]) => message)).toEqual([
      'Uploading files… 0/2',
      'Uploading files… 1/2',
      'Uploading files… 2/2',
    ]);
    expect(success).toHaveBeenCalledWith(
      'Upload complete · 2/2',
      expect.objectContaining({ id: 'upload' })
    );
  });

  it('dismisses progress and reports the completed count on failure', async () => {
    copy.mockResolvedValueOnce({ success: true, message: '', data: ['a'] });
    copy.mockResolvedValueOnce({ success: false, message: 'Copy failed' });

    const result = importFilesToFolder({
      folderPath: 'folder',
      filePaths: ['/a', '/b'],
    });

    const error = await result.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(QueryError);
    expect((error as Error).message).toBe(
      'Upload stopped · 1/2 completed. Copy failed'
    );
    expect(dismiss).toHaveBeenCalledWith('upload');
    expect(success).not.toHaveBeenCalled();
  });
});
