import { mergeRegister } from "@lexical/utils";
import { useAtomValue, useSetAtom } from "jotai";
import {
	$getNodeByKey,
	$getSelection,
	$isNodeSelection,
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	CLEAR_HISTORY_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	CONTROLLED_TEXT_INSERTION_COMMAND,
	FORMAT_TEXT_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_ESCAPE_COMMAND,
	type LexicalEditor,
	REDO_COMMAND,
	SELECTION_CHANGE_COMMAND,
	type TextFormatType,
	UNDO_COMMAND,
} from "lexical";
import {
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
	useEffect,
} from "react";
import { toast } from "sonner";
import { GetNoteMarkdown } from "../../../../bindings/github.com/etesam913/bytebook/noteservice";
import { ShutoffTerminals } from "../../../../bindings/github.com/etesam913/bytebook/terminalservice";
import {
	draggedElementAtom,
	noteContainerRefAtom,
	noteEditorAtom,
} from "../../../atoms";
import { useFileIntersectionObserver } from "../../../hooks/observers";
import type { EditorBlockTypes, FloatingDataType } from "../../../types";
import { DEFAULT_SONNER_OPTIONS } from "../../../utils/misc";
import { useCustomNavigate } from "../../../utils/routing";
import { CodeNode } from "../nodes/code";
import { FileNode } from "../nodes/file";
import { CUSTOM_TRANSFORMERS } from "../transformers";
import {
	overrideControlledTextInsertion,
	overrideEscapeKeyCommand,
	overrideUndoRedoCommand,
	overrideUpDownKeyCommand,
} from "../utils/note-commands";
import { $convertFromMarkdownStringCorrect } from "../utils/note-metadata";
import { updateToolbar } from "../utils/toolbar";

/** Gets note markdown from local system */
export function useNoteMarkdown(
	editor: LexicalEditor,
	folder: string,
	note: string,
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>,
	setNoteMarkdownString: Dispatch<SetStateAction<string>>,
) {
	const noteContainerRef = useAtomValue(noteContainerRefAtom);
	const setEditor = useSetAtom(noteEditorAtom);
	const { navigate } = useCustomNavigate();
	useEffect(() => {
		async function fetchNoteMarkdown() {
			setEditor(editor);
			try {
				const res = await GetNoteMarkdown(
					`notes/${decodeURIComponent(folder)}/${decodeURIComponent(note)}.md`,
				);

				if (res.success) {
					editor.setEditable(true);
					// You don't want a different note to access the same history when you switch notes
					editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
					setNoteMarkdownString(res.data);

					// Scroll to top of the new note. There is a set timeout because there is something that has to load in for the note for its scroll to be accurate
					setTimeout(() => {
						if (noteContainerRef?.current) {
							noteContainerRef.current.scrollTo(0, 0);
						}
					}, 20);

					editor.update(
						() => {
							// Clear formatting
							setCurrentSelectionFormat((prev) => {
								for (const format of prev)
									editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
								return [];
							});

							$convertFromMarkdownStringCorrect(
								res.data,
								CUSTOM_TRANSFORMERS,
								setFrontmatter,
							);
						},
						{ tag: "note:initial-load" },
					);
				} else {
					throw new Error("Failed in retrieving note markdown");
				}
			} catch (e) {
				if (e instanceof Error) toast.error(e.message, DEFAULT_SONNER_OPTIONS);
				navigate("/not-found");
			}
		}

		fetchNoteMarkdown();

		return () => {
			// We don't want a stale frontmatter to be used on a new note
			setFrontmatter({});
			setEditor(null);
		};
	}, [folder, note, editor, setCurrentSelectionFormat]);
}

export function useMutationListener(
	editor: LexicalEditor,
	folder: string,
	note: string,
	frontmatter: Record<string, string>,
) {
	useEffect(() => {
		const codeNodeMutationListener = editor.registerMutationListener(
			CodeNode,
			(mutatedNodes) => {
				const codeKeys: string[] = [];
				for (const [nodeKey, mutation] of mutatedNodes) {
					if (mutation === "destroyed") {
						codeKeys.push(nodeKey);
					}
				}
				ShutoffTerminals(codeKeys);
			},
		);

		return () => {
			codeNodeMutationListener();
		};
	}, [folder, note, frontmatter]);
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
	setIsNodeSelection: Dispatch<SetStateAction<boolean>>,
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>,
	noteContainerRef: MutableRefObject<HTMLDivElement | null>,
) {
	const draggedElement = useAtomValue(draggedElementAtom);

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
						setIsNodeSelection,
						setFloatingData,
						noteContainerRef,
					);
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				CONTROLLED_TEXT_INSERTION_COMMAND,
				(e) => {
					return overrideControlledTextInsertion(e, editor, draggedElement);
				},
				COMMAND_PRIORITY_HIGH,
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
						const nodes = selection.getNodes();
						let isInProhibitedNode = false;
						nodes.forEach((node) => {
							// Backspace in code block could mean you are deleting code instead of the whole block.
							if (
								node.getType() === "code-block" ||
								node.getType() === "excalidraw"
							) {
								isInProhibitedNode = true;
								return;
							}
							node.remove();
						});
						if (!isInProhibitedNode) {
							e.preventDefault();
							return true;
						}
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
			editor.registerCommand(
				UNDO_COMMAND,
				overrideUndoRedoCommand,
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				REDO_COMMAND,
				overrideUndoRedoCommand,
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_ESCAPE_COMMAND,
				() => {
					const selection = $getSelection();
					if ($isNodeSelection(selection)) {
						const node = selection.getNodes().at(0);
						if (node) {
							overrideEscapeKeyCommand(node.getKey());
							return true;
						}
					}
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
		noteContainerRef,
		draggedElement,
	]);
}
