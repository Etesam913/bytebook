import type { SandpackFiles } from "@codesandbox/sandpack-react";
import type { HeadingTagType } from "@lexical/rich-text";
import type { ReactNode } from "react";

export const IMAGE_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export const VIDEO_FILE_EXTENSIONS = [".mov", ".mp4"];

export type EditorBlockTypes = HeadingTagType | undefined | string;

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

export type CodeBlockData = { files: SandpackFiles; result: CodeResultType };

export type CodeResultType = {
	message: string;
	success: boolean;
};
