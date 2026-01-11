export type FileOrFolderType = 'file' | 'folder';

type BaseFileOrFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
};

type Folder = BaseFileOrFolder & {
  type: typeof FOLDER_TYPE;
  childrenIds: string[];
  isOpen: boolean;
  isDataStale: boolean;
};

type File = BaseFileOrFolder & {
  type: typeof FILE_TYPE;
};

export type FileOrFolder = File | Folder;

/** Represents the content that will be in the virtualized list */
export type FlattenedFileOrFolder = FileOrFolder & { level: number };

export const FOLDER_TYPE = 'folder';
export const FILE_TYPE = 'file';
