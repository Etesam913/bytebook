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
import { DEFAULT_SONNER_OPTIONS, FILE_SERVER_URL } from "../../utils/misc";
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
		| "svelte"
		| "rust"
		| "cpp";
	keywords: string[];
	icon?: JSX.Element;
}[] = [
	{ name: "go", keywords: ["go", "google"] },
	{ name: "java", keywords: ["java", "coffee"] },
	{ name: "python", keywords: ["python", "py"] },
	{ name: "javascript", keywords: ["javascript", "js"] },
	{ name: "react", keywords: ["javascript", "react", "jsx"] },
	{ name: "rust", keywords: ["rust", "rs"] },
	{ name: "cpp", keywords: ["c++", "cpp"] },
	{
		name: "angular",
		keywords: ["javascript", "angular", "js"],
		icon: <AngularLogo height="17" width="17" />,
	},
	{
		name: "vue",
		keywords: ["javascript", "vue", "js"],
		icon: <VueLogo height="17" width="17" />,
	},
	{
		name: "svelte",
		keywords: ["javascript", "svelte", "js"],
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
			toast.error("Failed to open link", DEFAULT_SONNER_OPTIONS);
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
	setFrontmatter?: Dispatch<SetStateAction<Record<string, string>>>,
	node?: ElementNode,
): void {
	const importMarkdown = createMarkdownImport(transformers);

	let markdownString = markdown;

	if (hasFrontMatter(markdown)) {
		const { frontMatter, content } = parseFrontMatter(markdown);

		if (setFrontmatter) {
			setFrontmatter(frontMatter);
		}

		markdownString = content;
	}
	importMarkdown(markdownString, node);
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
			let result = regex.exec(text);
			while (result) {
				indexes.push(result.index);
				result = regex.exec(text);
			}

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

const frontMatterRegex = /^---[\s\S]+?---/;

/**
 * Checks if a Markdown string contains front matter.
 *
 * Front matter is a section at the beginning of a Markdown file
 * that is enclosed within triple dashes (`---`). It is commonly used
 * for metadata such as title, author, date, etc.
 *
 * @param {string} markdown - The Markdown string to check.
 * @returns {boolean} - Returns `true` if the Markdown string contains front matter, `false` otherwise.
 */
export function hasFrontMatter(markdown: string): boolean {
	return frontMatterRegex.test(markdown);
}

function parseYaml(yamlString: string): Record<string, string> {
	const lines = yamlString.split("\n");
	const frontMatter: Record<string, string> = {};

	lines.forEach((line) => {
		const [key, ...rest] = line.split(":");
		if (key && rest.length > 0) {
			frontMatter[key.trim()] = rest.join(":").trim();
		}
	});

	return frontMatter;
}

export function parseFrontMatter(markdown: string): {
	frontMatter: Record<string, string>;
	content: string;
} {
	const match = markdown.match(frontMatterRegex);

	let frontMatter: Record<string, string> = {};
	let content = markdown;

	if (match) {
		const frontMatterString = match[0];
		frontMatter = parseYaml(frontMatterString);
		// We do +1 as there is a newline from the --- that we want to get rid of
		content = markdown.slice(match[0].length + 1);
	}
	return { frontMatter, content };
}

/**
 * Creates front matter from a record of key-value pairs.
 *
 * This function takes an object where the keys and values are strings,
 * and generates a front matter section formatted with triple dashes (`---`).
 *
 * @param {Record<string, string>} data - The key-value pairs to include in the front matter.
 * @returns {string} - The generated front matter string.
 */
function createFrontMatter(data: Record<string, string>): string {
	// Initialize the front matter string with the opening triple dashes
	let frontMatter = "---\n";

	// Iterate over each key-value pair in the input object
	for (const [key, value] of Object.entries(data)) {
		// Append each key-value pair to the front matter string in the format "key: value"
		frontMatter += `${key}: ${value}\n`;
	}

	// Close the front matter section with the closing triple dashes
	frontMatter += "---\n";

	// Return the generated front matter string
	return frontMatter;
}

/**
 * Replaces the front matter in a Markdown string with new front matter.
 *
 * If the Markdown string already contains front matter, it will be replaced with the new front matter.
 * If no front matter is found, the new front matter will be prepended to the Markdown content.
 *
 * @param {string} markdown - The original Markdown string.
 * @param {Record<string, string>} newFrontMatterData - The key-value pairs for the new front matter.
 * @returns {string} - The Markdown string with the replaced or prepended front matter.
 */
export function replaceFrontMatter(
	markdown: string,
	newFrontMatterData: Record<string, string>,
): string {
	// Create the new front matter string from the provided data
	const newFrontMatter = createFrontMatter(newFrontMatterData);
	if (frontMatterRegex.test(markdown)) {
		// If existing front matter is found, replace it with the new front matter
		return markdown.replace(frontMatterRegex, newFrontMatter);
	}
	// If no front matter is found, prepend the new front matter to the markdown content
	return newFrontMatter + markdown;
}

/**
 * Calculates the time difference between two dates and returns it in a human-readable format.
 *
 * @param date1 - The earlier date.
 * @param date2 - The later date.
 * @returns A string representing the time difference in the largest applicable unit (e.g., "2 years", "3 days").
 */
export function timeSince(date1: Date, date2: Date): string {
	// Calculate the difference in seconds between the two dates
	const seconds = Math.floor((date2.getTime() - date1.getTime()) / 1000);

	// Define intervals in seconds for years, months, days, hours, and minutes
	const intervals = [
		{ label: "years", seconds: 31536000 },
		{ label: "months", seconds: 2592000 },
		{ label: "days", seconds: 86400 },
		{ label: "hours", seconds: 3600 },
		{ label: "minutes", seconds: 60 },
	];

	// Loop through each interval to find the largest applicable unit of time
	for (const { label, seconds: intervalSeconds } of intervals) {
		const interval = Math.floor(seconds / intervalSeconds);
		// If the interval is greater than 1, return the time difference in this unit
		if (interval >= 1) {
			if (interval === 1) {
				return `${interval} ${label.slice(0, -1)}`;
			}
			return `${interval} ${label}`;
		}
	}

	// If none of the larger intervals apply, return the time difference in seconds
	return `${Math.floor(seconds)} seconds`;
}
