import * as wails from "@wailsio/runtime";
import { useSetAtom } from "jotai";
import {
	CLEAR_HISTORY_COMMAND,
	FORMAT_TEXT_COMMAND,
	type LexicalEditor,
	type TextFormatType,
} from "lexical";
import { type Dispatch, type SetStateAction, useEffect } from "react";
import { navigate } from "wouter/use-browser-location";
import { CleanAndCopyFiles } from "../../../bindings/main/NodeService";
import { GetNoteMarkdown } from "../../../bindings/main/NoteService";
import { mostRecentNotesAtom } from "../../atoms.ts";
import { INSERT_IMAGES_COMMAND } from "./plugins/image.tsx";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import { $convertFromMarkdownStringCorrect } from "./utils";

/** Gets note markdown from local system */
export function useNoteMarkdown(
	editor: LexicalEditor,
	folder: string,
	note: string,
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
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
							const cleanedFilePaths = await CleanAndCopyFiles(
								event.data.join(","),
								folder,
								note,
							);

							editor.update(() => {
								const payloads = cleanedFilePaths.map((filePath) => ({
									src: `http://localhost:5890/${filePath}`,
									alt: "test",
								}));
								editor.dispatchCommand(INSERT_IMAGES_COMMAND, payloads);
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

/** Updates the most recent notes queue */
export function useMostRecentNotes(folder: string, note: string) {
	const setMostRecentNotes = useSetAtom(mostRecentNotesAtom);

	useEffect(() => {
		const currentPath = `${folder}/${note}`;

		// I have to read from localStorage because the mostRecentNotes atom is out of date for some reason
		const tempMostRecentNotes = JSON.parse(
			localStorage.getItem("mostRecentNotes") ?? "[]",
		) as string[];
		const isCurrentNoteInMostRecent = tempMostRecentNotes.findIndex(
			(path) => path === currentPath,
		);
		if (isCurrentNoteInMostRecent !== -1) {
			tempMostRecentNotes.splice(isCurrentNoteInMostRecent, 1);
		}
		tempMostRecentNotes.unshift(currentPath);
		if (tempMostRecentNotes.length > 5) tempMostRecentNotes.pop();

		setMostRecentNotes(tempMostRecentNotes);
	}, [folder, note, setMostRecentNotes]);
}
