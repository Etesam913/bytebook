import {
	CLEAR_HISTORY_COMMAND,
	FORMAT_TEXT_COMMAND,
	type LexicalEditor,
	type TextFormatType,
} from "lexical";
import { type Dispatch, useEffect } from "react";
import { navigate } from "wouter/use-browser-location";
import { GetNoteMarkdown } from "../../../wailsjs/go/main/App";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { $convertFromMarkdownStringCorrect } from "./utils";

/** Gets note markdown from local system */
export function useNoteMarkdown(
	editor: LexicalEditor,
	folder: string,
	note: string,
	setCurrentSelectionFormat: Dispatch<React.SetStateAction<TextFormatType[]>>,
) {
	useEffect(() => {
		GetNoteMarkdown(folder, note)
			.then((markdown) => {
				editor.setEditable(true);
				// You don't want a different note to access the same history when you switch notes
				editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);

				editor.update(() => {
					// Clear formatting
					setCurrentSelectionFormat((prev) => {
						for (const format of prev)
							editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);

						return [];
					});
					$convertFromMarkdownStringCorrect(markdown, CUSTOM_TRANSFORMERS);
				});
			})
			.catch((e) => {
				console.error(e);
				navigate("/");
			});
	}, [folder, note, editor, setCurrentSelectionFormat]);
}