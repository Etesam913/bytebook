import { navigate } from 'wouter/use-browser-location';
import { type FilePath, type FolderPath } from '../../utils/path';
import { Folder as FolderIcon } from '../../icons/folder';
import { RenderNoteIcon } from '../../icons/render-note-icon';
import {
  FILE_TYPE,
  FOLDER_TYPE,
} from '../virtualized/virtualized-file-tree/types';

type RendererItem = {
  id: string;
  name: string;
};

export type FolderRendererItem = RendererItem &
  (
    | {
        type: typeof FOLDER_TYPE;
        path: FolderPath;
      }
    | {
        type: typeof FILE_TYPE;
        path: FilePath;
      }
  );

export function FolderRendererCard({ item }: { item: FolderRendererItem }) {
  return (
    <button
      type="button"
      onClick={() =>
        navigate(
          item.type === 'folder'
            ? item.path.encodedFolderUrl
            : item.path.encodedFileUrl
        )
      }
      className="flex w-full items-start gap-2.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-650 dark:bg-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-650"
    >
      <span className="mt-0.75">
        {item.type === 'folder' ? (
          <FolderIcon
            className="min-w-4 min-h-4"
            height="1rem"
            width="1rem"
            strokeWidth={1.75}
          />
        ) : (
          <RenderNoteIcon filePath={item.path} size="sm" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium leading-5 text-zinc-900 dark:text-zinc-50">
          {item.name}
        </span>
        <span className="block truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400">
          {item.path.fullPath}
        </span>
      </span>
    </button>
  );
}
