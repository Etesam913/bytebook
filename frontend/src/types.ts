import type { SandpackFiles } from "@codesandbox/sandpack-react";
import type { HeadingTagType } from "@lexical/rich-text";
import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import type { CodeResponse } from "../bindings/github.com/etesam913/bytebook/index";

export const IMAGE_FILE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];

export const VIDEO_FILE_EXTENSIONS = ["mov", "mp4", "m4v"];

export type EditorBlockTypes = HeadingTagType | undefined | string;

export type DropdownItem = {
	value: string;
	label: ReactNode;
};

export type UserData = {
	login: string;
	accessToken: string;
	avatarUrl: string;
	email: string;
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

export type CodeBlockData = { files: SandpackFiles; result: CodeResponse };

export type ResizeWidth = number | "100%";

export type ResizeState = {
	isResizing: boolean;
	setIsResizing: Dispatch<SetStateAction<boolean>>;
	isSelected: boolean;
	isExpanded: boolean;
	setIsExpanded: Dispatch<SetStateAction<boolean>>;
};

export type DialogDataType = {
	isOpen: boolean;
	title: string;
	children: ((errorText: string) => ReactNode) | null;
	dialogClassName?: string;
	onSubmit:
		| ((
				e: FormEvent<HTMLFormElement>,
				setErrorText: Dispatch<SetStateAction<string>>,
		  ) => Promise<boolean>)
		| null;
	onClose?: () => void;
};

export type SearchPanelDataType = {
	isOpen: boolean;
	query: string;
	focusedIndex: number;
};

export type BackendQueryDataType = {
	isLoading: boolean;
	message: string;
};

export type SortStrings =
	| "date-updated-desc"
	| "date-updated-asc"
	| "date-created-desc"
	| "date-created-asc"
	| "file-name-a-z"
	| "file-name-z-a"
	| "size-desc"
	| "size-asc";
