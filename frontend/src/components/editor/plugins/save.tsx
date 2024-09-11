import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { Events } from "@wailsio/runtime";
import {
	COMMAND_PRIORITY_EDITOR,
	type LexicalCommand,
	createCommand,
} from "lexical";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { SetNoteMarkdown } from "../../../../bindings/github.com/etesam913/bytebook/noteservice";
import { WINDOW_ID } from "../../../App";
import { CUSTOM_TRANSFORMERS } from "../transformers";
import {
	$convertToMarkdownStringCorrect,
	replaceFrontMatter,
} from "../utils/note-metadata";

export const SAVE_MARKDOWN_CONTENT: LexicalCommand<
	undefined | Record<string, string>
> = createCommand("SAVE_MARKDOWN_CONTENT");

export function SavePlugin({
	folder,
	note,
	frontmatter,
	setFrontmatter,
}: {
	folder: string;
	note: string;
	frontmatter: Record<string, string>;
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>;
}) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<undefined | Record<string, string>>(
				SAVE_MARKDOWN_CONTENT,
				(payload) => {
					const markdown = $convertToMarkdownStringCorrect(CUSTOM_TRANSFORMERS);
					const frontmatterCopy = payload ? { ...payload } : { ...frontmatter };
					const timeOfChange = new Date().toISOString();
					frontmatterCopy.lastUpdated = timeOfChange;
					if (frontmatterCopy.createdDate === undefined) {
						frontmatterCopy.createdDate = timeOfChange;
					}
					const markdownWithFrontmatter = replaceFrontMatter(
						markdown,
						frontmatterCopy,
					);
					Events.Emit({
						name: "note:changed",
						data: {
							folder,
							note,
							markdown: markdownWithFrontmatter,
							oldWindowAppId: WINDOW_ID,
						},
					});
					setFrontmatter(frontmatterCopy);
					SetNoteMarkdown(
						decodeURIComponent(folder),
						decodeURIComponent(note),
						markdownWithFrontmatter,
					);

					return true;
				},
				COMMAND_PRIORITY_EDITOR,
			),
		);
	}, [editor, folder, note, frontmatter, setFrontmatter]);

	return null;
}
