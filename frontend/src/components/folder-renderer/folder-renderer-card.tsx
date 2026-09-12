import { Link } from 'react-aria-components/Link';
import { type FilePath, type FolderPath } from '@utils/path';
import { Folder as FolderIcon } from '@/icons/folder';
import { RenderNoteIcon } from '@/icons/render-note-icon';
import { FILE_TYPE, FOLDER_TYPE } from '@utils/tree-item-types';

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
    <Link
      href={
        item.type === FOLDER_TYPE
          ? item.path.encodedFolderUrl
          : item.path.encodedFileUrl
      }
      className="flex min-w-0 w-full cursor-default items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-left hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-750 outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color)"
    >
      <span className="mt-0.5 shrink-0 text-zinc-500 dark:text-zinc-400">
        {item.type === FOLDER_TYPE ? (
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
      <span title={item.path.fullPath} className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-5 text-zinc-900 dark:text-zinc-50">
          {item.name}
        </span>
        <span className="mt-0.5 block truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400">
          {item.path.fullPath}
        </span>
      </span>
    </Link>
  );
}
