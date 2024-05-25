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
	$getNodeByKey,
	$getRoot,
	$getSelection,
	$isDecoratorNode,
	$isElementNode,
	$isNodeSelection,
	$isRangeSelection,
	$isRootNode,
	$isTextNode,
	$setSelection,
	type ElementNode,
	type LexicalEditor,
	type LexicalNode,
	type TextFormatType,
	type TextNode,
} from "lexical";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { toast } from "sonner";
import { UploadImage } from "../../../bindings/github.com/etesam913/bytebook/nodeservice";
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
import { isDecoratorNodeSelected } from "../../utils/commands";
import { FILE_SERVER_URL } from "../../utils/misc";
import { createMarkdownExport } from "./MarkdownExport";
import { createMarkdownImport } from "./MarkdownImport";
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

/** Opens the link in the browser when clicked */
export function handleATag(target: HTMLElement) {
	const parentElement = target.parentElement as HTMLLinkElement;
	if (parentElement.href.startsWith("wails://")) {
	} else {
		Browser.OpenURL(parentElement.href).catch(() => {
			toast.error("Failed to open link");
		});
	}
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
		if (node.getType() !== "code-block") {
			nodeToSelect?.selectEnd();
		}
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
 * Makes it so that the code-block undo/redo stack is not affected by the undo/redo stack of the editor
 */
export function overrideUndoRedoCommand() {
	const selection = $getSelection();
	if ($isNodeSelection(selection)) {
		const element = selection.getNodes().at(0);
		// The code-block has its own undo stack, no need to use lexical's undo stack for this
		if (element?.getType() === "code-block") {
			return true;
		}
	}
	return false;
}

export function escapeKeyDecoratorNodeCommand(nodeKey: string) {
	if (isDecoratorNodeSelected(nodeKey)) {
		const nodeElem = $getNodeByKey(nodeKey);
		if (nodeElem) {
			const nextElem = nodeElem.getNextSibling();
			if ($isDecoratorNode(nextElem)) {
				const nodeSelection = $createNodeSelection();
				nodeSelection.add(nextElem.getKey());
				$setSelection(nodeSelection);
			} else {
				nodeElem.selectNext(0, 0);
			}
		}
	}
	return false;
}

/**
    Text match transformers (Image, Video, etc...)
    should have text to the left and right be paragraphs
    instead of text nodes. This allows for easier editing.

    Returns `undefined` if there is no match, otherwise returns the `replaceNode`
*/
export function handleTextMatchTransformerReplace(
	anchorNode: TextNode,
	match: RegExpMatchArray | null,
) {
	if (!match) return;
	const startIndex = match.index || 0;
	const endIndex = startIndex + match[0].length;
	let replaceNode: TextNode | null = null;

	// Handle other text match transformers here
	if (startIndex === 0) {
		[replaceNode] = anchorNode.splitText(endIndex);
	} else {
		[, replaceNode] = anchorNode.splitText(startIndex, endIndex);
	}

	replaceNode.selectNext(0, 0);

	return replaceNode;
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

/** Clears all highlights in the note */
export function clearHighlights(editor: LexicalEditor, callback?: () => void) {
	editor.update(() => {
		/** Helper function to recursively clear highlight styles from text nodes */
		function clearHighlightNode(node: LexicalNode) {
			// Skip nodes that are not element nodes
			if (!$isElementNode(node)) return;

			const children = node.getChildren();
			const textChildren = children.filter($isTextNode);

			// If there are no immediate text children, recursively search children
			if (textChildren.length === 0) {
				for (const child of children) {
					clearHighlightNode(child);
				}
				return;
			}

			// Remove highlight styles from all text nodes
			for (const textNode of textChildren) {
				textNode.setStyle("");
			}
		}

		// Start the recursive clearing of highlights from the root's children
		const children = $getRoot().getChildren();
		for (const child of children) {
			clearHighlightNode(child);
		}
	});

	callback?.();
}

/** Highlights all matches of the search string in the note */
export function searchWithinNote(
	editor: LexicalEditor,
	searchString: string,
	callback: () => void,
) {
	editor.update(() => {
		const regex = new RegExp(searchString, "gi");

		/** Helper function to recursively search and highlight text nodes */
		function highlightNode(node: LexicalNode) {
			// We can't highlight node elements
			if (!$isElementNode(node)) return;

			const children = node.getChildren();
			const textChildren = children.filter($isTextNode);

			// If there are no immediate text children, recursively search children
			if (textChildren.length === 0) {
				for (const child of children) {
					highlightNode(child);
				}
				return;
			}

			// Removing any potential highlight from text so that the previous search highlight can be undo
			for (const textNode of textChildren) {
				textNode.setStyle("background-color: none;color: inherit");
			}

			const text = node.getTextContent();
			const indexes = [];
			let result;

			while ((result = regex.exec(text))) indexes.push(result.index);

			if (!indexes.length) return;

			// Chunks are used to split the text into multiple texts with each text potentially having a highlight style if it matched
			const chunks = [];
			if (indexes[0] !== 0) chunks.push(0);
			for (const index of indexes)
				chunks.push(index, index + searchString.length);
			if (chunks.at(-1) !== text.length) chunks.push(text.length);

			// Removing the unhighlighted version of the text
			node.clear();

			for (let i = 0; i < chunks.length - 1; i++) {
				const start = chunks[i];
				const end = chunks[i + 1];
				const textNode = $createTextNode(text.slice(start, end));

				// Adding a highlighted text chunk
				if (indexes.includes(chunks[i])) {
					textNode.setStyle("background-color: #FFFF00;color: #000000");
				}
				node.append(textNode);
			}
		}

		const children = $getRoot().getChildren();
		for (const child of children) highlightNode(child);
	});

	callback();
}
