export type FileOrFolderType = 'file' | 'folder';

interface FileOrFolder {
  id: string;
  path: string;
  parentId: string | null;
  type: FileOrFolderType;
  childrenIds: string[];
}

interface FileTreeElements {
  items: Record<string, FileOrFolder>;
}

export function FileTree() {
  return <div>file tree</div>;
}
