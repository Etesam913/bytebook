import type { SandpackFiles } from "@codesandbox/sandpack-react";
import type { HeadingTagType } from "@lexical/rich-text";
import type { Dispatch, ReactNode, SetStateAction } from "react";

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

export type FloatingDataType = {
	isOpen: boolean;
	top: number;
	left: number;
	type: null | "link" | "text-format";
};

export type CodeBlockData = { files: SandpackFiles; result: CodeResultType };

export type CodeResultType = {
	message: string;
	success: boolean;
};

export type ResizeWidth = number | "100%";

export type ResizeState = {
	isResizing: boolean;
	setIsResizing: Dispatch<SetStateAction<boolean>>;
	isSelected: boolean;
	isExpanded: boolean;
	setIsExpanded: Dispatch<SetStateAction<boolean>>;
	setIsSubtitlesDialogOpen?: Dispatch<SetStateAction<boolean>>;
};
