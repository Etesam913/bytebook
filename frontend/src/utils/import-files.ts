import { toast, type ExternalToast } from 'sonner';
import { AddAttachmentsFromPaths } from '@bindings/services/nodeservice';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';
import { QueryError, getBackendResponseData } from '@utils/query';
import { stripTrailingSlash } from '@utils/path';

// Shared by native drops and the attachment picker so both report copy progress.
export async function importFilesToFolder({
  folderPath,
  filePaths,
}: {
  folderPath: string;
  filePaths: string[];
}): Promise<string[]> {
  if (filePaths.length === 0) {
    return [];
  }

  const total = filePaths.length;
  let completed = 0;
  const options: ExternalToast = {
    ...DEFAULT_SONNER_OPTIONS,
    position: 'bottom-right',
  };
  const toastId = toast.loading(`Uploading files… 0/${total}`, {
    ...options,
    duration: Infinity,
    dismissible: false,
    closeButton: false,
  });
  const importedPaths: string[] = [];

  try {
    // The copy response confirms completion; watcher events can arrive
    // before a file has finished copying and also include unrelated files.
    for (const filePath of filePaths) {
      const imported = await getBackendResponseData(
        AddAttachmentsFromPaths(stripTrailingSlash(folderPath), [filePath])
      );
      importedPaths.push(...(imported ?? []));
      completed += 1;
      toast.loading(`Uploading files… ${completed}/${total}`, {
        ...options,
        id: toastId,
        duration: Infinity,
        dismissible: false,
        closeButton: false,
      });
    }

    toast.success(`Upload complete · ${completed}/${total}`, {
      ...options,
      id: toastId,
    });
    return importedPaths;
  } catch (error) {
    toast.dismiss(toastId);
    const message = error instanceof Error ? error.message : String(error);
    throw new QueryError(
      `Upload stopped · ${completed}/${total} completed. ${message}`
    );
  }
}
