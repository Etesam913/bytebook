import {
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
	type ElementTransformer,
	TRANSFORMERS,
	type TextFormatTransformer,
	type TextMatchTransformer,
} from "@lexical/markdown";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { Browser, Events } from "@wailsio/runtime";
import {
	$createNodeSelection,
	$createParagraphNode,
	$createTextNode,
	$getSelection,
	$isDecoratorNode,
	$isElementNode,
	$isRangeSelection,
	$isRootNode,
	$setSelection,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
	type TextFormatType,
	type TextNode,
} from "lexical";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { toast } from "sonner";
import { UploadImage } from "../../../bindings/main/NodeService";
import { WINDOW_ID } from "../../App";
import { AngularLogo } from "../../icons/angular-logo";
import { ImageIcon } from "../../icons/image";
import { ListCheckbox } from "../../icons/list-checkbox";
import { OrderedList } from "../../icons/ordered-list";
import { SvelteLogo } from "../../icons/svelte-logo";
import { TextBold } from "../../icons/text-bold";
import { TextItalic } from "../../icons/text-italic";
import { TextStrikethrough } from "../../icons/text-strikethrough";
import { TextUnderline } from "../../icons/text-underline";
import { UnorderedList } from "../../icons/unordered-list";
import { VueLogo } from "../../icons/vue-logo";
import type { EditorBlockTypes } from "../../types";
import { FILE_SERVER_URL } from "../../utils/misc";
import { createMarkdownExport } from "./MarkdownExport";
import { createMarkdownImport } from "./MarkdownImport";
import { ImageNode } from "./nodes/image";
import { INSERT_IMAGES_COMMAND } from "./plugins/image";

export type TextFormats =
	| null
	| "bold"
	| "italic"
	| "underline"
	| "strikethrough";

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

export const languageCommandData: {
	name:
		| "go"
		| "java"
		| "python"
		| "javascript"
		| "react"
		| "angular"
		| "vue"
		| "svelte";
	keywords: string[];
	icon?: JSX.Element;
}[] = [
	{ name: "go", keywords: ["go", "google"] },
	{ name: "java", keywords: ["java", "coffee"] },
	{ name: "python", keywords: ["python"] },
	{ name: "javascript", keywords: ["javascript"] },
	{ name: "react", keywords: ["javascript", "react"] },
	{
		name: "angular",
		keywords: ["javascript", "angular"],
		icon: <AngularLogo height="17" width="17" />,
	},
	{
		name: "vue",
		keywords: ["javascript", "vue"],
		icon: <VueLogo height="17" width="17" />,
	},
	{
		name: "svelte",
		keywords: ["javascript", "svelte"],
		icon: <SvelteLogo height="17" width="17" />,
	},
];

export const imageCommandData = {
	block: "img",
	icon: <ImageIcon />,
	command: INSERT_IMAGES_COMMAND,
};

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

/** Goes in direction up the tree until it finds a valid sibling */
function getFirstSiblingNode(
	node: LexicalNode | undefined,
	direction: "up" | "down",
) {
	if (!node) return null;
	let siblingNode =
		direction === "up" ? node.getPreviousSibling() : node.getNextSibling();
	let currentNode = node;
	while (!siblingNode) {
		const parent = currentNode.getParent();
		if (!parent) return null;
		currentNode = parent;
		siblingNode =
			direction === "up"
				? currentNode.getPreviousSibling()
				: currentNode.getNextSibling();
	}
	return siblingNode;
}

export function overrideUpDownKeyCommand(
	event: KeyboardEvent,
	command: "up" | "down",
) {
	const selection = $getSelection();
	const node = selection?.getNodes().at(0);

	if (!node) return true;
	if ($isRootNode(node)) {
		const firstChild = node.getFirstChild();
		if (!firstChild) return true;
		return true;
	}

	const nextNode = getFirstSiblingNode(node, command);
	let nextNodeChild: LexicalNode | null = null;
	if (nextNode && $isElementNode(nextNode)) {
		nextNodeChild = nextNode.getChildren().at(0) ?? null;
	}
	const nodeToSelect = nextNodeChild ?? nextNode;

	// going from <p> -> <img>
	if ($isDecoratorNode(nodeToSelect)) {
		const newNodeSelection = $createNodeSelection();
		newNodeSelection.add(nodeToSelect.getKey());
		$setSelection(newNodeSelection);
		event.preventDefault();
	}
	// going from <img> -> <p>
	else if ($isDecoratorNode(node)) {
		event.preventDefault();
		nodeToSelect?.selectEnd();
	}

	return true;
}

export type Transformer =
	| ElementTransformer
	| TextFormatTransformer
	| TextMatchTransformer;

export function $convertToMarkdownStringCorrect(
	transformers: Array<Transformer> = TRANSFORMERS,
	node?: ElementNode,
): string {
	const exportMarkdown = createMarkdownExport(transformers);
	return exportMarkdown(node);
}

export function $convertFromMarkdownStringCorrect(
	markdown: string,
	transformers: Array<Transformer> = TRANSFORMERS,
	node?: ElementNode,
): void {
	const importMarkdown = createMarkdownImport(transformers);
	importMarkdown(markdown, node);
}

/**
    Text match transformers (Image, Video, etc...)
    should have text to the left and right be paragraphs
    instead of text nodes. This allows for easier editing.

    Returns `undefined` if there is no match, otherwise returns the `replaceNode`
*/
export function handleTextMatchTransformerReplace(
	transformer: TextMatchTransformer,
	anchorNode: TextNode,
	match: RegExpMatchArray | null,
) {
	const textContent = anchorNode.getTextContent();

	if (!match) return;
	const startIndex = match.index || 0;
	const endIndex = startIndex + match[0].length;
	let replaceNode: TextNode | null = null;
	const textToLeft = textContent.slice(0, startIndex);
	const middleText = match[0];
	const textToRight = textContent.slice(endIndex);

	// if (transformer.dependencies.includes(ImageNode)) {
	// 	const parent = anchorNode.getParent();
	// 	replaceNode = $createTextNode(middleText);
	// 	if (parent) {
	// 		// Remove old children and replace with just the image
	// 		for (const child of parent.getChildren()) {
	// 			child.remove();
	// 		}

	// 		const newParent = $createParagraphNode();

	// 		parent.replace(newParent);
	// 		newParent.select(0, 0);

	// 		newParent.append(replaceNode);
	// 		if (textToLeft.length > 0) {
	// 			newParent.insertBefore(
	// 				$createParagraphNode().append($createTextNode(textToLeft)),
	// 			);
	// 		}
	// 		if (textToRight.length > 0) {
	// 			newParent.insertAfter(
	// 				$createParagraphNode().append($createTextNode(textToRight)),
	// 			);
	// 		}
	// 		return replaceNode;
	// 	}
	// } else {
	// 	// Handle other text match transformers here
	// 	if (startIndex === 0) {
	// 		[replaceNode] = anchorNode.splitText(endIndex);
	// 	} else {
	// 		[, replaceNode] = anchorNode.splitText(startIndex, endIndex);
	// 	}

	// 	replaceNode.selectNext(0, 0);

	// 	return replaceNode;
	// }

	// Handle other text match transformers here
	if (startIndex === 0) {
		[replaceNode] = anchorNode.splitText(endIndex);
	} else {
		[, replaceNode] = anchorNode.splitText(startIndex, endIndex);
	}

	replaceNode.selectNext(0, 0);

	return replaceNode;
}

export function handleATag(target: HTMLElement) {
	const parentElement = target.parentElement as HTMLLinkElement;
	if (parentElement.href.startsWith("wails://")) {
	} else {
		Browser.OpenURL(parentElement.href).catch(() => {
			toast.error("Failed to open link");
		});
	}
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

		const filePaths = paths as unknown as string[];
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
