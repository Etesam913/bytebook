import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	CHECK_LIST,
	type ElementTransformer,
	INLINE_CODE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	ORDERED_LIST,
	QUOTE,
	STRIKETHROUGH,
	type TextFormatTransformer,
	type TextMatchTransformer,
	UNORDERED_LIST,
} from "@lexical/markdown";
import {
	$createHeadingNode,
	$isHeadingNode,
	HeadingNode,
	type HeadingTagType,
} from "@lexical/rich-text";
import {
	$createTableCellNode,
	$createTableNode,
	$createTableRowNode,
	$isTableCellNode,
	$isTableNode,
	$isTableRowNode,
	TableCellHeaderStates,
	TableCellNode,
	TableNode,
	TableRowNode,
} from "@lexical/table";
import {
	$createNodeSelection,
	$createTextNode,
	$isParagraphNode,
	$isTextNode,
	$setSelection,
	type ElementNode,
	type LexicalNode,
} from "lexical";
import {
	IMAGE_FILE_EXTENSIONS,
	type ResizeWidth,
	VIDEO_FILE_EXTENSIONS,
} from "../../types";
import { codeLanguages } from "../../utils/code";
import {
	addQueryParam,
	getQueryParamValue,
	removeQueryParam,
} from "../../utils/string-formatting";
import { $createCodeNode, $isCodeNode, CodeNode } from "./nodes/code";
import {
	$createExcalidrawNode,
	$isExcalidrawNode,
	ExcalidrawNode,
} from "./nodes/excalidraw";
import {
	$createFileNode,
	$isFileNode,
	FileNode,
	type FileType,
} from "./nodes/file";
import { $createLinkNode, $isLinkNode, LinkNode } from "./nodes/link";
import type { Transformer } from "./utils/note-metadata";

export const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/;

const createBlockNode = (
	createNode: (match: Array<string>) => ElementNode,
): ElementTransformer["replace"] => {
	return (parentNode, children, match) => {
		const node = createNode(match);
		node.append(...children);
		parentNode.replace(node);
		node.select(0, 0);
	};
};

const srcRegex = /\/notes\/([^/]+)\/([^/]+)\//;

/** Updates image src when location pathname changes, should revisit this */
function updateSrc(nodeSrc: string) {
	// If it is coming from file-server update url if the folder name or note title changes
	if (!nodeSrc.includes("localhost")) {
		return nodeSrc;
	}
	const urlSplit = location.pathname.split("/");
	const currentFolder = urlSplit.at(1);

	return nodeSrc.replace(srcRegex, `/notes/${currentFolder}/attachments/`);
}

const FILE_TRANSFORMER: TextMatchTransformer = {
	dependencies: [FileNode],
	export: (node) => {
		let filePathOrSrc = "";
		let altText = "";
		if (!$isFileNode(node)) {
			return null;
		}

		filePathOrSrc = updateSrc(node.getSrc());

		altText = addQueryParam(
			node.getAltText(),
			"width",
			String(node.getWidth()),
		);

		// TODO: need to do sanitizing on the alt text
		return `![${altText}](${filePathOrSrc}) `;
	},
	importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
	regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
	replace: (textNode, match) => {
		const alt = match.at(1);
		const filePathOrSrc = match.at(2);
		if (!alt || !filePathOrSrc) {
			textNode.replace(textNode);
			return;
		}
		const shouldCreateImageNode = IMAGE_FILE_EXTENSIONS.some((extension) =>
			filePathOrSrc.endsWith(extension),
		);
		const shouldCreateVideoNode = VIDEO_FILE_EXTENSIONS.some((extension) =>
			filePathOrSrc.endsWith(extension),
		);

		const widthQueryValue = getQueryParamValue(alt, "width");
		const width: ResizeWidth = widthQueryValue
			? widthQueryValue.charAt(widthQueryValue.length - 1) === "%"
				? "100%"
				: Number.parseInt(widthQueryValue)
			: "100%";
		let elementType: FileType = "unknown";
		if (shouldCreateImageNode) elementType = "image";
		else if (shouldCreateVideoNode) elementType = "video";

		const nodeToCreate = $createFileNode({
			alt: removeQueryParam(alt, "width"),
			src: filePathOrSrc,
			width,
			elementType,
		});

		textNode.replace(nodeToCreate);
	},
	type: "text-match",
	trigger: ")",
};

const CUSTOM_HEADING_TRANSFORMER: ElementTransformer = {
	dependencies: [HeadingNode],
	export: (node, exportChildren) => {
		if (!$isHeadingNode(node)) {
			return null;
		}
		const level = Number(node.getTag().slice(1));
		return `${"#".repeat(level)} ${exportChildren(node)}`;
	},
	regExp: /^(#{1,3})\s/,

	replace: createBlockNode((match) => {
		const tag = `h${match[1].length}` as HeadingTagType;
		return $createHeadingNode(tag);
	}),
	type: "element",
};

export function indexBy<T>(
	list: Array<T>,
	callback: (arg0: T) => string,
): Readonly<Record<string, Array<T>>> {
	const index: Record<string, Array<T>> = {};

	for (const item of list) {
		const key = callback(item);

		if (index[key]) {
			index[key].push(item);
		} else {
			index[key] = [item];
		}
	}

	return index;
}

export function transformersByType(transformers: Array<Transformer>): Readonly<{
	element: Array<ElementTransformer>;
	textFormat: Array<TextFormatTransformer>;
	textMatch: Array<TextMatchTransformer>;
}> {
	const byType = indexBy(transformers, (t) => t.type);

	return {
		element: (byType.element || []) as Array<ElementTransformer>,
		textFormat: (byType["text-format"] || []) as Array<TextFormatTransformer>,
		textMatch: (byType["text-match"] || []) as Array<TextMatchTransformer>,
	};
}

export const CODE_TRANSFORMER: ElementTransformer = {
	dependencies: [ExcalidrawNode, CodeNode],
	export: (node: LexicalNode) => {
		if ($isCodeNode(node)) {
			const textContent = JSON.stringify(node.getData());
			return `\`\`\`${node.getLanguage()} {command=${node.getCommand()}} ${
				textContent ? `\n${textContent}` : ""
			}\n\`\`\``;
		}
		if ($isExcalidrawNode(node)) {
			const textContent = "";
			return `\`\`\`excalidraw {width=${node.getWidth()}} ${
				textContent ? `\n${textContent}` : ""
			}\n\`\`\``;
		}
		return null;
	},
	regExp: /^```(\w{1,10})?\s/,
	replace: (textNode, _1, match, isImport) => {
		// MarkdownImport.ts handles the import of code blocks
		const language = match.at(1);
		if (
			!language ||
			(!codeLanguages.has(language) && language !== "excalidraw")
		) {
			return;
		}
		let newNode = null;
		if (language === "excalidraw") {
			newNode = $createExcalidrawNode({ elements: [] });
		} else {
			newNode = $createCodeNode({
				language: language,
				focus: !isImport,
			});
		}

		const nodeSelection = $createNodeSelection();
		nodeSelection.add(newNode.getKey());
		textNode.replace(newNode);
		$setSelection(nodeSelection);
	},
	type: "element",
};

export const LINK: TextMatchTransformer = {
	dependencies: [LinkNode],
	export: (node, _, exportFormat) => {
		if (!$isLinkNode(node)) {
			return null;
		}

		const linkContent = `[${encodeURIComponent(
			node.getTextContent(),
		)}](${encodeURIComponent(node.getURL())})`;
		const firstChild = node.getFirstChild();
		// Add text styles only if link has single text node inside. If it's more
		// than one we ignore it as markdown does not support nested styles for links
		if (node.getChildrenSize() === 1) {
			if ($isTextNode(firstChild)) {
				return exportFormat(firstChild, linkContent);
			}
		}
		return linkContent;
	},
	importRegExp:
		/(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))/,
	regExp:
		/(?:\[([^[]+)\])(?:\((?:([^()\s]+)(?:\s"((?:[^"]*\\")*[^"]*)"\s*)?)\))$/,
	replace: (textNode, match) => {
		let [, linkText, linkUrl, linkTitle] = match;
		linkText = decodeURIComponent(linkText);
		linkUrl = decodeURIComponent(linkUrl);

		const linkNode = $createLinkNode(linkUrl, {
			title: linkTitle,
		});
		const linkTextNode = $createTextNode(linkText);
		linkTextNode.setFormat(textNode.getFormat());
		linkNode.append(linkTextNode);
		textNode.replace(linkNode);
	},
	trigger: ")",
	type: "text-match",
};

// Very primitive table setup
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_ROW_DIVIDER_REG_EXP = /^(\| ?:?-*:? ?)+\|\s?$/;

export const TABLE: ElementTransformer = {
	dependencies: [TableNode, TableRowNode, TableCellNode],
	export: (node: LexicalNode) => {
		if (!$isTableNode(node)) {
			return null;
		}

		const output: string[] = [];

		for (const row of node.getChildren()) {
			const rowOutput = [];
			if (!$isTableRowNode(row)) {
				continue;
			}

			let isHeaderRow = false;
			for (const cell of row.getChildren()) {
				// It's TableCellNode so it's just to make flow happy
				if ($isTableCellNode(cell)) {
					rowOutput.push(
						$convertToMarkdownString(CUSTOM_TRANSFORMERS, cell).replace(
							/\n/g,
							"\\n",
						),
					);
					if (cell.__headerState === TableCellHeaderStates.ROW) {
						isHeaderRow = true;
					}
				}
			}

			output.push(`| ${rowOutput.join(" | ")} |`);
			if (isHeaderRow) {
				output.push(`| ${rowOutput.map((_) => "---").join(" | ")} |`);
			}
		}

		return output.join("\n");
	},
	regExp: TABLE_ROW_REG_EXP,
	replace: (parentNode, _1, match) => {
		// Header row
		if (TABLE_ROW_DIVIDER_REG_EXP.test(match[0])) {
			const table = parentNode.getPreviousSibling();
			if (!table || !$isTableNode(table)) {
				return;
			}

			const rows = table.getChildren();
			const lastRow = rows[rows.length - 1];
			if (!lastRow || !$isTableRowNode(lastRow)) {
				return;
			}

			// Add header state to row cells
			lastRow.getChildren().forEach((cell) => {
				if (!$isTableCellNode(cell)) {
					return;
				}
				cell.toggleHeaderStyle(TableCellHeaderStates.ROW);
			});

			// Remove line
			parentNode.remove();
			return;
		}

		const matchCells = mapToTableCells(match[0]);

		if (matchCells == null) {
			return;
		}

		const rows = [matchCells];
		let sibling = parentNode.getPreviousSibling();
		let maxCells = matchCells.length;

		while (sibling) {
			if (!$isParagraphNode(sibling)) {
				break;
			}

			if (sibling.getChildrenSize() !== 1) {
				break;
			}

			const firstChild = sibling.getFirstChild();

			if (!$isTextNode(firstChild)) {
				break;
			}

			const cells = mapToTableCells(firstChild.getTextContent());

			if (cells == null) {
				break;
			}

			maxCells = Math.max(maxCells, cells.length);
			rows.unshift(cells);
			const previousSibling = sibling.getPreviousSibling();
			sibling.remove();
			sibling = previousSibling;
		}

		const table = $createTableNode();

		for (const cells of rows) {
			const tableRow = $createTableRowNode();
			table.append(tableRow);

			for (let i = 0; i < maxCells; i++) {
				tableRow.append(i < cells.length ? cells[i] : createTableCell(""));
			}
		}

		const previousSibling = parentNode.getPreviousSibling();
		if (
			$isTableNode(previousSibling) &&
			getTableColumnsSize(previousSibling) === maxCells
		) {
			previousSibling.append(...table.getChildren());
			parentNode.remove();
		} else {
			parentNode.replace(table);
		}

		table.selectEnd();
	},
	type: "element",
};

function getTableColumnsSize(table: TableNode) {
	const row = table.getFirstChild();
	return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

const createTableCell = (textContent: string): TableCellNode => {
	const cleanedTextContent = textContent.replace(/\\n/g, "\n");
	const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
	$convertFromMarkdownString(cleanedTextContent, CUSTOM_TRANSFORMERS, cell);
	return cell;
};

const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
	const match = textContent.match(TABLE_ROW_REG_EXP);
	if (!match || !match[1]) {
		return null;
	}
	return match[1].split("|").map((text) => createTableCell(text));
};

export const CUSTOM_TRANSFORMERS = [
	CUSTOM_HEADING_TRANSFORMER,
	CHECK_LIST,
	UNORDERED_LIST,
	ORDERED_LIST,
	QUOTE,
	BOLD_ITALIC_STAR,
	BOLD_ITALIC_UNDERSCORE,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	STRIKETHROUGH,
	FILE_TRANSFORMER,
	LINK,
	CODE_TRANSFORMER,
	TABLE,
	INLINE_CODE,
];
