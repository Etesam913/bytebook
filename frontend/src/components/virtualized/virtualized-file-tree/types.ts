export type FileOrFolderType = 'file' | 'folder';

type Folder = {
  id: string;
  name: string;
  path: string;
  type: typeof FOLDER_TYPE;
  childrenIds: string[];
  isOpen: boolean;
  isDataStale: boolean;
};

type File = {
  id: string;
  name: string;
  path: string;
  type: typeof FILE_TYPE;
};

export type FileOrFolder = File | Folder;

/** Represents the content that will be in the virtualized list */
export type FlattenedFileOrFolder = FileOrFolder & { level: number };

export const FOLDER_TYPE = 'folder';
export const FILE_TYPE = 'file';
