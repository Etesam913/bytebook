import type { ListNodeTagType } from "@lexical/list/LexicalListNode";
import type { HeadingTagType } from "@lexical/rich-text";

export const IMAGE_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export const VIDEO_FILE_EXTENSIONS = [".mov", ".mp4"];

export type EditorBlockTypes =
	| HeadingTagType
	| ListNodeTagType
	| undefined
	| string;

export type DropdownItem = {
	value: string;
	label: ReactNode;
};

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

export type FloatingLinkData = {
	isOpen: boolean;
	top: number;
	left: number;
};
