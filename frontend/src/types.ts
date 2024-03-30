import { ListNodeTagType } from "@lexical/list/LexicalListNode";
import { HeadingTagType } from "@lexical/rich-text";

export type EditorBlockTypes =
  | HeadingTagType
  | ListNodeTagType
  | undefined
  | string;

export type FolderDialogState = {
  isOpen: boolean;
  folderName: string;
  action?: FolderDialogAction;
};

export type FolderDialogAction = "create" | "rename" | "delete";

export type MostRecentNoteType = {
  name: string;
  path: string;
};
