import {
	$getSelection,
	CLEAR_HISTORY_COMMAND,
	FORMAT_TEXT_COMMAND,
	type LexicalEditor,
	type TextFormatType,
} from "lexical";
import { type Dispatch, useEffect } from "react";
import { navigate } from "wouter/use-browser-location";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { $convertFromMarkdownStringCorrect } from "./utils";
import { GetNoteMarkdown } from "../../../bindings/main/NoteService";
import * as wails from "@wailsio/runtime";
import { CleanImagePaths } from "../../../bindings/main/NodeService";
import { INSERT_IMAGE_COMMAND } from "./plugins/image";

/** Gets note markdown from local system */
export function useNoteMarkdown(
	editor: LexicalEditor,
	folder: string,
	note: string,
	setCurrentSelectionFormat: Dispatch<React.SetStateAction<TextFormatType[]>>,
) {
	useEffect(() => {
		GetNoteMarkdown(folder, note)
			.then((res) => {
				if (res.success) {
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
						$convertFromMarkdownStringCorrect(res.data, CUSTOM_TRANSFORMERS);
					});
				}
			})
			.catch((e) => {
				console.error(e);
				navigate("/");
			});
	}, [folder, note, editor, setCurrentSelectionFormat]);
}

export function useFileDropEvent(
	editor: LexicalEditor,
	folder: string,
	note: string,
) {
	useEffect(
		// @ts-expect-error It is not type of EffectCallback, which is okay in this case
		() => {
			return wails.Events.On(
				"files",
				async (event: {
					name: string;
					data: string[];
					sender: string;
					Cancelled: boolean;
				}) => {
					if (!event.Cancelled) {
						try {
							const cleanedFilePaths = await CleanImagePaths(
								event.data.join(","),
								folder,
								note,
							);

							editor.update(() => {
								console.log($getSelection());
								for (const filePath of cleanedFilePaths) {
									editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
										src: `http://localhost:5890/${filePath}`,
										alt: "test",
									});
								}
							});
						} catch (e) {
							console.log(e);
							// error checking here
						}
					}
				},
			);
		},
		[folder, note, editor],
	);
}
