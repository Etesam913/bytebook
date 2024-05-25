import { $isListNode, ListNode } from "@lexical/list";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { useAtom } from "jotai";
import {
	$createTextNode,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
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
import { navigate } from "wouter/use-browser-location";
import {
	GetNoteMarkdown,
	ValidateMostRecentNotes,
} from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import { mostRecentNotesAtom } from "../../atoms.ts";
import {
	type EditorBlockTypes,
	type FloatingDataType,
	IMAGE_FILE_EXTENSIONS,
} from "../../types.ts";
import { FILE_SERVER_URL } from "../../utils/misc.ts";
import type { ImagePayload } from "./nodes/image.tsx";
import { $createLinkNode } from "./nodes/link.tsx";
import { INSERT_IMAGES_COMMAND } from "./plugins/image.tsx";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import {
	$convertFromMarkdownStringCorrect,
	type TextFormats,
	escapeKeyDecoratorNodeCommand,
	overrideUndoRedoCommand,
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
				} else {
					throw new Error("Failed in retrieving note markdown");
				}
			})
			.catch((e) => {
				console.error(e);
				navigate("/not-found", { replace: true });
			});
	}, [folder, note, editor, setCurrentSelectionFormat]);
}

// export function useFileDropEvent(
// 	editor: LexicalEditor,
// 	folder: string,
// 	note: string,
// ) {
// 	useEffect(
// 		// @ts-expect-error It is not type of EffectCallback, which is okay in this case
// 		() => {
// 			return wails.Events.On(
// 				"files",
// 				async (event: {
// 					name: string;
// 					data: string[];
// 					sender: string;
// 					Cancelled: boolean;
// 				}) => {
// 					if (!event.Cancelled) {
// 						try {
// 							const cleanedFilePaths = await CleanAndCopyFiles(
// 								event.data.join(","),
// 								folder,
// 								note,
// 							);

// 							editor.update(() => {
// 								const payloads = cleanedFilePaths.map((filePath) => ({
// 									src: `${FILE_SERVER_URL}/${filePath}`,
// 									alt: "test",
// 								}));
// 								editor.dispatchCommand(INSERT_IMAGES_COMMAND, payloads);
// 							});
// 						} catch (e) {
// 							console.error(e);
// 							// error checking here
// 						}
// 					}
// 				},
// 			);
// 		},
// 		[folder, note, editor],
// 	);
// }

/** Updates the most recent notes queue */
export function useMostRecentNotes(folder: string, note: string) {
	const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);

	useEffect(() => {
		const currentPath = `${folder}/${note}`;
		const tempMostRecentNotes = mostRecentNotes.filter(
			(path) => path !== currentPath,
		);
		if (tempMostRecentNotes.length > 5) {
			tempMostRecentNotes.unshift();
		}
		tempMostRecentNotes.push(currentPath);
		ValidateMostRecentNotes(tempMostRecentNotes).then((res) => {
			setMostRecentNotes(res ?? []);
		});
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
	setIsNodeSelection: Dispatch<SetStateAction<boolean>>,
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>,
	noteContainerRef: MutableRefObject<HTMLDivElement | null>,
) {
	const selection = $getSelection();
	setIsNodeSelection($isNodeSelection(selection));

	if ($isRangeSelection(selection)) {
		setDisabled(false);
		// Shows the text-format hover container
		const selectionText = selection.getTextContent().trim();
		if (selectionText.length > 0) {
			const nativeSelection = window.getSelection()?.getRangeAt(0);
			const domRect = nativeSelection?.getBoundingClientRect();
			if (domRect) {
				const { top: topOfSelectionToWindow, left } = domRect;
				const noteContainerBounds =
					noteContainerRef.current?.getBoundingClientRect();
				const topOfScrollContainerToWindow = noteContainerBounds?.top ?? 0;
				const scrollYOfScrollContainer =
					noteContainerRef.current?.scrollTop ?? 0;

				setFloatingData({
					isOpen: true,
					top:
						topOfSelectionToWindow -
						topOfScrollContainerToWindow +
						scrollYOfScrollContainer -
						80,
					left: left - (noteContainerBounds?.left ?? 0),
					type: "text-format",
				});
			}
		} else {
			setFloatingData((prev) => ({ ...prev, isOpen: false, type: null }));
		}
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
		setFloatingData((prev) => ({ ...prev, isOpen: false, type: null }));
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
	setIsNodeSelection: Dispatch<SetStateAction<boolean>>,
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>,
	noteContainerRef: MutableRefObject<HTMLDivElement | null>,
	folder: string,
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
					// @ts-ignore Data Transfer does exist when dragging a link
					if (!e.dataTransfer) return false;

					// @ts-ignore Data Transfer does exist when dragging a link
					const fileText: string = e.dataTransfer.getData("text/plain");
					const files = fileText.split(",");
					const imagePayloads: ImagePayload[] = [];
					const linkPayloads = [];

					for (const fileText of files) {
						const extension = `.${fileText.split(".").pop()}`;
						// Handling dragging of image attachment link
						if (extension && IMAGE_FILE_EXTENSIONS.includes(extension)) {
							imagePayloads.push({
								src: `${FILE_SERVER_URL}/notes/${folder}/attachments/${fileText}`,
								alt: "test",
							});
						} else if (fileText.startsWith("wails:")) {
							linkPayloads.push({
								url: fileText,
								title: fileText.split("/").pop() ?? "",
							});
						}
					}

					if (imagePayloads.length > 0) {
						editor.dispatchCommand(INSERT_IMAGES_COMMAND, imagePayloads);
					}
					// Creating links
					for (const linkPayload of linkPayloads) {
						const linkNode = $createLinkNode(linkPayload.url, {
							title: linkPayload.title,
						});
						const linkTextNode = $createTextNode(linkPayload.title);
						linkNode.append(linkTextNode);
						const selection = $getSelection();
						if ($isRangeSelection(selection)) {
							selection.insertNodes([linkNode]);
						}
					}
					return true;
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
							escapeKeyDecoratorNodeCommand(node.getKey());
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
	]);
}
