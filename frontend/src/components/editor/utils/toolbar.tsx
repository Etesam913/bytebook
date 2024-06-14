import {
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { Events } from "@wailsio/runtime";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	type LexicalEditor,
	type TextFormatType,
} from "lexical";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { toast } from "sonner";
import { UploadImage } from "../../../../bindings/github.com/etesam913/bytebook/nodeservice";
import { WINDOW_ID } from "../../../App";
import { ImageIcon } from "../../../icons/image";
import { ListCheckbox } from "../../../icons/list-checkbox";
import { OrderedList } from "../../../icons/ordered-list";
import { TextBold } from "../../../icons/text-bold";
import { TextItalic } from "../../../icons/text-italic";
import { TextStrikethrough } from "../../../icons/text-strikethrough";
import { TextUnderline } from "../../../icons/text-underline";
import { UnorderedList } from "../../../icons/unordered-list";
import type { EditorBlockTypes } from "../../../types";
import { FILE_SERVER_URL } from "../../../utils/misc";
import { INSERT_IMAGES_COMMAND } from "../plugins/image";

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
	attachments: string[],
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
				case "img": {
					insertImageFromFile(folder, note, editor, attachments);
					break;
				}
			}
		}
	});
}

/** Used to add images from filesystem into attachments folder & editor */
export async function insertImageFromFile(
	folder: string,
	note: string,
	editor: LexicalEditor,
	attachments: string[],
) {
	try {
		const { success, message, paths } = await UploadImage(folder, note);

		const filePaths = paths;
		editor.update(() => {
			const payloads = filePaths.map((filePath) => ({
				src: `${FILE_SERVER_URL}/${filePath}`,
				alt: "test",
			}));
			editor.dispatchCommand(INSERT_IMAGES_COMMAND, payloads);
			if (!success) toast.error(message);
			Events.Emit({
				name: "attachments:changed",
				data: {
					windowId: WINDOW_ID,
					attachments: [
						...attachments,
						...filePaths.map((filePath) => filePath.split("/").pop()),
					],
				},
			});
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
	{ label: "Image", value: "img" },
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
	command: INSERT_IMAGES_COMMAND,
};
