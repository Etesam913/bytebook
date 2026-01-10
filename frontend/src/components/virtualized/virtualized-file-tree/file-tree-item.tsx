import { Folder } from '../../../icons/folder';
import { FolderOpen } from '../../../icons/folder-open';
import { Note } from '../../../icons/page';
import { useOpenFolderMutation } from './hooks';
import { FlattenedFileOrFolder } from './types';

function FileItemIcon({ dataItem }: { dataItem: FlattenedFileOrFolder }) {
  if (dataItem.type === 'file') {
    return (
      <Note
        className="min-w-4 min-h-4"
        height={16}
        width={16}
        strokeWidth={1.75}
      />
    );
  }

  if (dataItem.isOpen) {
    return (
      <FolderOpen
        className="min-w-4 min-h-4"
        height={16}
        width={16}
        strokeWidth={1.75}
      />
    );
  }

  return (
    <Folder
      className="min-w-4 min-h-4"
      height={16}
      width={16}
      strokeWidth={1.75}
    />
  );
}

const INDENT_WIDTH = 12;

export function FileTreeItem({
  dataItem,
}: {
  dataItem: FlattenedFileOrFolder;
}) {
  const { mutate: openFolder } = useOpenFolderMutation();

  const isFolder = dataItem.type === 'folder';

  return (
    <button
      className="flex items-center gap-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-650 pr-1 rounded-md w-full"
      style={{
        paddingLeft: `${(dataItem.level + 1) * INDENT_WIDTH}px`,
      }}
      onClick={() => {
        if (isFolder) {
          openFolder({
            pathToFolder: dataItem.path,
            folderId: dataItem.id,
          });
        }
      }}
    >
      <FileItemIcon dataItem={dataItem} />{' '}
      <span className="truncate">{dataItem.name}</span>
    </button>
  );
}
