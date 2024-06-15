import {
	type ElementTransformer,
	TRANSFORMERS,
	type TextFormatTransformer,
	type TextMatchTransformer,
} from "@lexical/markdown";
import type { ElementNode } from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { createMarkdownExport } from "../MarkdownExport";
import { createMarkdownImport } from "../MarkdownImport";

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
