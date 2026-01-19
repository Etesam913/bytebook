/**
 * The type of an item in the file tree: either a file or a folder.
 */
export type FileOrFolderType = 'file' | 'folder';

/**
 * Base properties shared by both files and folders.
 */
type BaseFileOrFolder = {
  /** Path to the file or folder (serves as the unique identifier). */
  id: string;
  /** Display name of the file or folder. */
  name: string;
  /** Identifier for the parent folder. Null for top-level items. */
  parentId: string | null;
};

/**
 * Represents a folder in the file tree.
 */
export type Folder = BaseFileOrFolder & {
  /** The type for this object: always "folder". */
  type: typeof FOLDER_TYPE;
  /** IDs of immediate children (files or folders) inside this folder. */
  childrenIds: string[];
  /** Cursor for paginating through children; null if not paginated or all loaded. */
  childrenCursor: string | null;
  /** Whether this folder has more children (not all loaded in the UI). */
  hasMoreChildren: boolean;
  /** Whether the folder is currently open/expanded in the UI. */
  isOpen: boolean;
};

/**
 * Represents a file in the file tree.
 */
export type File = BaseFileOrFolder & {
  /** The type for this object: always "file". */
  type: typeof FILE_TYPE;
};

/**
 * Represents an item in the file tree: either a file or a folder.
 */
export type FileOrFolder = File | Folder;

/**
 * Describes a page of file or folder results, including pagination info.
 */
export type FileOrFolderPage = {
  /** The files or folders in this page. */
  items: FileOrFolder[];
  /** Cursor string for the next page (empty string if no more pages). */
  nextCursor: string;
  /** Whether more items are available after this page. */
  hasMore: boolean;
};

/**
 * A flattened representation of a file or folder,
 * including its nesting level for use in virtualized rendering.
 */
export type FlattenedFileOrFolder = FileOrFolder & {
  /** Depth level in the file tree (0 for root-level items). */
  level: number;
};

/**
 * Represents a special item shown in the file tree to allow loading more children of a folder.
 */
export type LoadMoreItem = {
  /** Path identifier for the "load more" marker (usually related to the parent folder). */
  id: string;
  /** Type indicating this is a load more marker. */
  type: 'load-more';
  /** The parent folder's id (path) this relates to. */
  parentId: string;
  /** Display name for the placeholder item (e.g., "Load more..."). */
  name: string;
  /** Level in the file tree where this item resides. */
  level: number;
};

/**
 * Represents any possible item in the virtualized file tree list:
 * either a file/folder (with level info) or a special "load more" item.
 */
export type VirtualizedFileTreeItem = FlattenedFileOrFolder | LoadMoreItem;

/** String literal identifying a folder type. */
export const FOLDER_TYPE = 'folder';
/** String literal identifying a file type. */
export const FILE_TYPE = 'file';
/** String literal identifying a load more type. */
export const LOAD_MORE_TYPE = 'load-more';
