import { $isListNode, ListNode } from "@lexical/list";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import * as wails from "@wailsio/runtime";
import { useSetAtom } from "jotai";
import {
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	CLEAR_HISTORY_COMMAND,
	COMMAND_PRIORITY_LOW,
	FORMAT_TEXT_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	type LexicalEditor,
	SELECTION_CHANGE_COMMAND,
	type TextFormatType,
} from "lexical";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { CleanAndCopyFiles } from "../../../bindings/main/NodeService";
import { GetNoteMarkdown } from "../../../bindings/main/NoteService";
import { mostRecentNotesAtom } from "../../atoms.ts";
import type { EditorBlockTypes } from "../../types.ts";
import { INSERT_IMAGES_COMMAND } from "./plugins/image.tsx";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import {
	$convertFromMarkdownStringCorrect,
	type TextFormats,
	overrideUpDownKeyCommand,
} from "./utils";

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
							console.error(e);
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

/**
 * Looks at the currently selected text and retrieves its block type and text format info.
 * It uses this information and sets some states
 */
function updateToolbar(
	editor: LexicalEditor,
	setDisabled: Dispatch<SetStateAction<boolean>>,
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>,
) {
	const selection = $getSelection();
	if ($isRangeSelection(selection)) {
		setDisabled(false);
		const anchorNode = selection.anchor.getNode();
		const element =
			anchorNode.getKey() === "root"
				? anchorNode
				: anchorNode.getTopLevelElementOrThrow();
		const elementKey = element.getKey();
		const elementDOM = editor.getElementByKey(elementKey);
		const selectionTextFormats: TextFormats[] = [];
		if (selection.hasFormat("bold")) {
			selectionTextFormats.push("bold");
		}
		if (selection.hasFormat("italic")) {
			selectionTextFormats.push("italic");
		}
		if (selection.hasFormat("underline")) {
			selectionTextFormats.push("underline");
		}
		if (selection.hasFormat("strikethrough")) {
			selectionTextFormats.push("strikethrough");
		}

		setCurrentSelectionFormat(selectionTextFormats as TextFormatType[]);

		if (!elementDOM) return;

		// Consists of headings like h1, h2, h3, etc.
		if ($isHeadingNode(element)) {
			const headingTag = element.getTag();
			setCurrentBlockType(headingTag);
		}
		// Consists of lists, like ol and ul
		else if ($isListNode(element)) {
			const parentList = $getNearestNodeOfType(anchorNode, ListNode);
			const type = parentList ? parentList.getTag() : element.getTag();
			if (element.getListType() === "check") {
				setCurrentBlockType("check");
			} else {
				setCurrentBlockType(type);
			}
		}
		// Consists of blocks like paragraph, quote, code, etc.
		else {
			setCurrentBlockType(element.getType());
		}
	} else if ($isNodeSelection(selection)) {
		setDisabled(true);
	}
}

/**
 * These are the events that are registered to the toolbar
 * It overrides up/down arrow keys to handle node selection
 * It also updates the toolbar when the selection changes
 */
export function useToolbarEvents(
	editor: LexicalEditor,
	setDisabled: Dispatch<SetStateAction<boolean>>,
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>,
	setCanUndo: Dispatch<SetStateAction<boolean>>,
	setCanRedo: Dispatch<SetStateAction<boolean>>,
) {
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				() => {
					updateToolbar(
						editor,
						setDisabled,
						setCurrentSelectionFormat,
						setCurrentBlockType,
					);
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_ARROW_UP_COMMAND,
				(event) => overrideUpDownKeyCommand(event, "up"),
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_ARROW_DOWN_COMMAND,
				(event) => overrideUpDownKeyCommand(event, "down"),
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				CAN_UNDO_COMMAND,
				(canUndo) => {
					setCanUndo(canUndo);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_BACKSPACE_COMMAND,
				(e) => {
					const selection = $getSelection();
					if ($isNodeSelection(selection)) {
						e.preventDefault();
						const nodes = selection.getNodes();
						nodes.forEach((node) => {
							// Backspace in code block could mean you are deleting code instead of the whole block.
							if (node.getType() === "code-block") return;
							node.remove();
						});
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				CAN_REDO_COMMAND,
				(canRedo) => {
					setCanRedo(canRedo);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [
		editor,
		setCurrentSelectionFormat,
		setCurrentBlockType,
		setDisabled,
		setCanRedo,
		setCanUndo,
	]);
}
