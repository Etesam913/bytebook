import {
	$isListNode,
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListNode,
} from "@lexical/list";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
	type LexicalEditor,
	type TextFormatType,
} from "lexical";
import type {
	Dispatch,
	MutableRefObject,
	ReactNode,
	SetStateAction,
} from "react";
import { toast } from "sonner";
import { AddAttachments } from "../../../../bindings/github.com/etesam913/bytebook/nodeservice";

import { ImageIcon } from "../../../icons/image";
import { ListCheckbox } from "../../../icons/list-checkbox";
import { OrderedList } from "../../../icons/ordered-list";
import { TextBold } from "../../../icons/text-bold";
import { TextItalic } from "../../../icons/text-italic";
import { TextStrikethrough } from "../../../icons/text-strikethrough";
import { TextUnderline } from "../../../icons/text-underline";
import { UnorderedList } from "../../../icons/unordered-list";
import type { EditorBlockTypes, FloatingDataType } from "../../../types";
import { FILE_SERVER_URL } from "../../../utils/misc";
import type { FilePayload } from "../nodes/file";
import { INSERT_FILES_COMMAND } from "../plugins/file";
import { getFileElementTypeFromExtension } from "./file-node.ts";

export function handleToolbarTextFormattingClick(
	currentSelectionFormat: TextFormatType[],
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
	textFormat: TextFormatType,
) {
	if (currentSelectionFormat.includes(textFormat)) {
		setCurrentSelectionFormat(
			currentSelectionFormat.filter((format) => format !== textFormat),
		);
	} else {
		setCurrentSelectionFormat([...currentSelectionFormat, textFormat]);
	}
}

/**
 * Gets a selection and formats the blocks to `newBlockType`
 */
export function changeSelectedBlocksType(
	editor: LexicalEditor,
	newBlockType: EditorBlockTypes,
	folder: string,
	note: string,
	insertAttachments: (
		folder: string,
		note: string,
		editor: LexicalEditor,
	) => void,
) {
	editor.update(async () => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			switch (newBlockType) {
				case "paragraph":
					$setBlocksType(selection, () => $createParagraphNode());
					break;
				case "h1":
					$setBlocksType(selection, () => $createHeadingNode("h1"));
					break;
				case "h2":
					$setBlocksType(selection, () => $createHeadingNode("h2"));
					break;
				case "h3":
					$setBlocksType(selection, () => $createHeadingNode("h3"));
					break;
				case "ol":
					editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
					break;
				case "ul":
					editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
					break;
				case "table":
					editor.dispatchCommand(INSERT_TABLE_COMMAND, {
						columns: "2",
						rows: "2",
						includeHeaders: true,
					});
					break;
				case "attachment": {
					insertAttachments(folder, note, editor);
					// insertAttachmentFromFile(folder, note, editor);
					break;
				}
			}
		}
	});
}

type TextFormats = null | "bold" | "italic" | "underline" | "strikethrough";

/**
 * Looks at the currently selected text and retrieves its block type and text format info.
 * It uses this information and sets some states
 */
export function updateToolbar(
	editor: LexicalEditor,
	setDisabled: Dispatch<SetStateAction<boolean>>,
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>,
	setIsNodeSelection: Dispatch<SetStateAction<boolean>>,
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>,
	noteContainerRef: MutableRefObject<HTMLDivElement | null>,
) {
	const selection = $getSelection();
	setIsNodeSelection($isNodeSelection(selection));

	if ($isRangeSelection(selection)) {
		setDisabled(false);
		// Shows the text-format hover container
		const selectionText = selection.getTextContent().trim();
		if (selectionText.length > 0) {
			const nativeSelection = window.getSelection()?.getRangeAt(0);
			const domRect = nativeSelection?.getBoundingClientRect();
			if (domRect) {
				const { top: topOfSelectionToWindow, left } = domRect;
				const noteContainerBounds =
					noteContainerRef.current?.getBoundingClientRect();
				const topOfScrollContainerToWindow = noteContainerBounds?.top ?? 0;
				const scrollYOfScrollContainer =
					noteContainerRef.current?.scrollTop ?? 0;

				setFloatingData({
					isOpen: true,
					top:
						topOfSelectionToWindow -
						topOfScrollContainerToWindow +
						scrollYOfScrollContainer -
						80,
					left: left - (noteContainerBounds?.left ?? 0),
					type: "text-format",
				});
			}
		} else {
			setFloatingData((prev) => ({ ...prev, isOpen: false, type: null }));
		}
		const anchorNode = selection.anchor.getNode();
		const element =
			anchorNode.getKey() === "root"
				? anchorNode
				: anchorNode.getTopLevelElementOrThrow();
		const elementKey = element.getKey();
		const elementDOM = editor.getElementByKey(elementKey);
		const selectionTextFormats: TextFormats[] = [];
		if (selection.hasFormat("bold")) {
			selectionTextFormats.push("bold");
		}
		if (selection.hasFormat("italic")) {
			selectionTextFormats.push("italic");
		}
		if (selection.hasFormat("underline")) {
			selectionTextFormats.push("underline");
		}
		if (selection.hasFormat("strikethrough")) {
			selectionTextFormats.push("strikethrough");
		}

		setCurrentSelectionFormat(selectionTextFormats as TextFormatType[]);

		if (!elementDOM) return;

		// Consists of headings like h1, h2, h3, etc.
		if ($isHeadingNode(element)) {
			const headingTag = element.getTag();
			setCurrentBlockType(headingTag);
		}
		// Consists of lists, like ol and ul
		else if ($isListNode(element)) {
			const parentList = $getNearestNodeOfType(anchorNode, ListNode);
			const type = parentList ? parentList.getTag() : element.getTag();
			if (element.getListType() === "check") {
				setCurrentBlockType("check");
			} else {
				setCurrentBlockType(type);
			}
		}
		// Consists of blocks like paragraph, quote, code, etc.
		else {
			setCurrentBlockType(element.getType());
		}
	} else if ($isNodeSelection(selection)) {
		setFloatingData((prev) => ({ ...prev, isOpen: false, type: null }));
		setDisabled(true);
	}
}

/** Used to add images from filesystem editor */
export async function insertAttachmentFromFile(
	folder: string,
	note: string,
	editor: LexicalEditor,
) {
	try {
		const { success, message, paths } = await AddAttachments(folder, note);
		// Goes through all the files and add them to the editor
		editor.update(() => {
			const payloads: FilePayload[] = paths.map((filePath) => ({
				src: `${FILE_SERVER_URL}/${filePath}`,
				alt: "test",
				elementType: getFileElementTypeFromExtension(filePath),
			}));
			editor.dispatchCommand(INSERT_FILES_COMMAND, payloads);
			if (!success) toast.error(message);
		});
	} catch (e: unknown) {
		if (e instanceof Error) {
			toast.error(e.message);
		}
	}
}

/** Used in dropdown for block types */
export const blockTypesDropdownItems = [
	{ label: "Header 1", value: "h1" },
	{ label: "Header 2", value: "h2" },
	{ label: "Header 3", value: "h3" },
	{ label: "Paragraph", value: "paragraph" },
	{ label: "Unordered List", value: "ul" },
	{ label: "Ordered List", value: "ol" },
	{ label: "Checkbox List", value: "check" },
	{ label: "Attachment", value: "attachment" },
	{ label: "Table", value: "table" },
];

export const listCommandData = [
	{
		block: "ul",
		icon: <UnorderedList />,
		command: INSERT_UNORDERED_LIST_COMMAND,
		title: "Unordered List",
		customDisabled: undefined,
	},
	{
		block: "ol",
		icon: <OrderedList />,
		command: INSERT_ORDERED_LIST_COMMAND,
		title: "Ordered List",
		customDisabled: undefined,
	},
	{
		block: "check",
		icon: <ListCheckbox />,
		command: INSERT_CHECK_LIST_COMMAND,
		title: "Check List",
		customDisabled: undefined,
	},
];

export const textFormats: { icon: ReactNode; format: TextFormatType }[] = [
	{
		icon: <TextBold />,
		format: "bold",
	},
	{
		icon: <TextItalic />,
		format: "italic",
	},
	{
		icon: <TextUnderline />,
		format: "underline",
	},
	{
		icon: <TextStrikethrough />,
		format: "strikethrough",
	},
];

export const imageCommandData = {
	block: "img",
	icon: <ImageIcon />,
	command: INSERT_FILES_COMMAND,
};
