import { $isListNode, ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode, eventFiles } from "@lexical/rich-text";
import {
	$getNearestNodeOfType,
	calculateZoomLevel,
	mergeRegister,
} from "@lexical/utils";
import type { MotionValue } from "framer-motion";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
	$createTextNode,
	$getNearestNodeFromDOMNode,
	$getNodeByKey,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	CLEAR_HISTORY_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	COMMAND_PRIORITY_NORMAL,
	CONTROLLED_TEXT_INSERTION_COMMAND,
	DRAGOVER_COMMAND,
	DROP_COMMAND,
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
	isHTMLElement,
} from "lexical";
import {
	type Dispatch,
	type MutableRefObject,
	type RefObject,
	type SetStateAction,
	useEffect,
} from "react";
import { navigate } from "wouter/use-browser-location";
import {
	GetNoteMarkdown,
	ValidateMostRecentNotes,
} from "../../../bindings/github.com/etesam913/bytebook/noteservice.ts";
import {
	draggableBlockElementAtom,
	draggedElementAtom,
	mostRecentNotesAtom,
} from "../../atoms.ts";
import type { EditorBlockTypes, FloatingDataType } from "../../types.ts";
import { throttle } from "../../utils/draggable.ts";

import { $createLinkNode } from "./nodes/link.tsx";

import { CUSTOM_TRANSFORMERS } from "./transformers";

import {
	DRAG_DATA_FORMAT,
	getBlockElement,
	setTargetLine,
} from "./utils/draggable-block.ts";
import {
	overrideEscapeKeyCommand,
	overrideUndoRedoCommand,
	overrideUpDownKeyCommand,
} from "./utils/note-commands.ts";
import { $convertFromMarkdownStringCorrect } from "./utils/note-metadata.ts";

type TextFormats = null | "bold" | "italic" | "underline" | "strikethrough";

/** Gets note markdown from local system */
export function useNoteMarkdown(
	editor: LexicalEditor,
	folder: string,
	note: string,
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>,
	setFrontmatter: Dispatch<SetStateAction<Record<string, string>>>,
) {
	useEffect(() => {
		GetNoteMarkdown(`notes/${decodeURIComponent(folder)}/${note}.md`)
			.then((res) => {
				if (res.success) {
					editor.setEditable(true);
					// You don't want a different note to access the same history when you switch notes
					editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
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
			})
			.catch((e) => {
				console.error(e);
				navigate("/not-found", { replace: true });
			});
	}, [folder, note, editor, setCurrentSelectionFormat]);
}

/** Updates the most recent notes queue */
export function useMostRecentNotes(folder: string, note: string) {
	const [mostRecentNotes, setMostRecentNotes] = useAtom(mostRecentNotesAtom);

	useEffect(() => {
		const currentPath = `${folder}/${note}`;
		const tempMostRecentNotes = mostRecentNotes.filter(
			(path) => path !== currentPath,
		);
		if (tempMostRecentNotes.length > 4) {
			tempMostRecentNotes.pop();
		}
		tempMostRecentNotes.unshift(currentPath);
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
					// @ts-ignore Data Transfer does exist when dragging a link
					if (!e.dataTransfer || !draggedElement) return false;

					// @ts-ignore Data Transfer does exist when dragging a link
					const fileText: string = e.dataTransfer.getData("text/plain");
					const files = fileText.split(",");

					const linkPayloads = [];

					for (const fileText of files) {
						// const extension = `.${fileText.split(".").pop()}`;
						// Handling dragging of image attachment link
						if (fileText.startsWith("wails:")) {
							linkPayloads.push({
								url: fileText,
								title: fileText.split("/").pop() ?? "",
							});
						}
					}

					// if (imagePayloads.length > 0) {
					// 	editor.dispatchCommand(INSERT_IMAGES_COMMAND, imagePayloads);
					// }
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
const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

function isOnHandle(element: HTMLElement): boolean {
	return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

/**
 * Gets the hovered element and stores it in a state
 * Does some checks to make sure that it is valid for dragging
 */
export function useDraggableBlock(
	noteContainerRef: RefObject<HTMLElement | null> | null,
) {
	const [draggableBlockElement, setDraggableBlockElement] = useAtom(
		draggableBlockElementAtom,
	);
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const noteContainerValue = noteContainerRef?.current;
		const throttledHandleMouseMove = throttle((e: MouseEvent) => {
			if (!noteContainerValue) {
				return;
			}
			const target = e.target;

			// The hovered element is not a HTMLElement
			if (!(target instanceof HTMLElement)) return;
			// If the hovered element is the handle itself, then there is nothing to do
			if (isOnHandle(target) || target.id === "target-line") return;

			// Stores the block element that is being hovered in state
			const _draggableBlockElem = getBlockElement(
				e,
				editor,
				noteContainerValue,
			);
			setDraggableBlockElement(_draggableBlockElem);
		}, 100);

		function handleMouseLeave() {
			setDraggableBlockElement(null);
		}

		noteContainerRef?.current?.addEventListener(
			"mousemove",
			throttledHandleMouseMove,
		);
		noteContainerRef?.current?.addEventListener("mouseleave", handleMouseLeave);

		return () => {
			noteContainerRef?.current?.removeEventListener(
				"mousemove",
				throttledHandleMouseMove,
			);
			noteContainerRef?.current?.removeEventListener(
				"mouseleave",
				handleMouseLeave,
			);
		};
	}, [noteContainerRef]);

	return { draggableBlockElement, setDraggableBlockElement };
}

/**
 * Updates the state of the target line based on the current mouse position when dragging
 */
export function useNodeDragEvents(
	editor: LexicalEditor,
	isDragging: boolean,
	noteContainerRef: RefObject<HTMLElement | null> | null,
	targetLineYMotionValue: MotionValue<number>,
) {
	const setDraggableBlockElement = useSetAtom(draggableBlockElementAtom);
	const noteContainer = noteContainerRef?.current;
	const draggedElement = useAtomValue(draggedElementAtom);

	useEffect(() => {
		function handleDragOver(event: DragEvent) {
			if (!isDragging) {
				return false;
			}
			const [isFileTransfer] = eventFiles(event);
			if (isFileTransfer) {
				return false;
			}

			const { pageY, target } = event;
			if (!target || !isHTMLElement(target) || !noteContainer) {
				return false;
			}
			const targetBlockElem = getBlockElement(
				event,
				editor,
				noteContainer,
				true,
			);

			if (targetBlockElem === null) return false;
			setTargetLine(
				targetBlockElem,
				pageY / calculateZoomLevel(target),
				noteContainer,
				targetLineYMotionValue,
			);
			// Prevent default event to be able to trigger onDrop events

			return true;
		}

		function handleOnDrop(event: DragEvent): boolean {
			if (!isDragging) {
				return false;
			}
			const [isFileTransfer] = eventFiles(event);
			if (isFileTransfer) {
				return false;
			}
			const { target, dataTransfer, pageY } = event;
			const dragData = dataTransfer?.getData(DRAG_DATA_FORMAT) || "";
			const draggedNode = $getNodeByKey(dragData);
			if (!draggedNode) {
				return false;
			}
			if (!target || !isHTMLElement(target) || !noteContainer) {
				return false;
			}
			const targetBlockElem = getBlockElement(
				event,
				editor,
				noteContainer,
				true,
			);

			if (!targetBlockElem) {
				return false;
			}
			const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
			if (!targetNode) {
				return false;
			}
			if (targetNode === draggedNode) {
				return true;
			}
			const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top;
			if (pageY / calculateZoomLevel(target) >= targetBlockElemTop) {
				targetNode.insertAfter(draggedNode);
			} else {
				targetNode.insertBefore(draggedNode);
			}
			draggedNode.selectStart();
			setDraggableBlockElement(null);

			return true;
		}

		return mergeRegister(
			editor.registerCommand(
				DRAGOVER_COMMAND,
				(e) => {
					/*
					 If an element out of the app is being dragged in, then let CONTROLLED_TEXT_INSERTION_COMMAND handle it
					 If it is in the app, but not a block element, then let CONTROLLED_TEXT_INSERTION_COMMAND handle it
					*/
					if (
						!draggedElement ||
						(draggedElement && draggedElement.id !== "block-element")
					) {
						return false;
					}
					e.preventDefault();
					return handleDragOver(e);
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				DROP_COMMAND,
				handleOnDrop,
				COMMAND_PRIORITY_NORMAL,
			),
		);
	}, [editor, noteContainerRef, isDragging, draggedElement]);
}
