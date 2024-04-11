import {
	$isListNode,
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListNode,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import type { SetStateAction } from "jotai/ts3.8/esm/vanilla";
import {
	$createParagraphNode,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	COMMAND_PRIORITY_LOW,
	DROP_COMMAND,
	FORMAT_TEXT_COMMAND,
	KEY_ARROW_DOWN_COMMAND,
	KEY_ARROW_UP_COMMAND,
	REDO_COMMAND,
	SELECTION_CHANGE_COMMAND,
	type TextFormatType,
	UNDO_COMMAND,
} from "lexical";
import { type Dispatch, type ReactNode, useEffect, useState } from "react";
import { isNoteMaximizedAtom, isToolbarDisabled } from "../../atoms";
import { Link } from "../../icons/link";
import { ListCheckbox } from "../../icons/list-checkbox";
import { OrderedList } from "../../icons/ordered-list";
import { Redo } from "../../icons/redo";
import { SidebarRightCollapse } from "../../icons/sidebar-right-collapse";
import { TextBold } from "../../icons/text-bold";
import { TextItalic } from "../../icons/text-italic";
import { TextStrikethrough } from "../../icons/text-strikethrough";
import { TextUnderline } from "../../icons/text-underline";
import { Undo } from "../../icons/undo";
import { UnorderedList } from "../../icons/unordered-list";
import type { EditorBlockTypes, FloatingLinkData } from "../../types";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { Dropdown } from "../dropdown";
import { useFileDropEvent, useNoteMarkdown } from "./hooks";
import {
	type TextFormats,
	blockTypesDropdownItems,
	changeSelectedBlocksType,
	handleToolbarTextFormattingClick,
	overrideUpDownKeyCommand,
} from "./utils";

const LOW_PRIORITY = 1;

interface ToolbarProps {
	folder: string;
	note: string;
	setFloatingLinkData: Dispatch<SetStateAction<FloatingLinkData>>;
}

export function Toolbar({ folder, note, setFloatingLinkData }: ToolbarProps) {
	const [editor] = useLexicalComposerContext();
	const [disabled, setDisabled] = useAtom(isToolbarDisabled);
	const [currentBlockType, setCurrentBlockType] =
		useState<EditorBlockTypes>("paragraph");
	const [currentSelectionFormat, setCurrentSelectionFormat] = useState<
		TextFormatType[]
	>([]);
	const [isNoteMaximized, setIsNoteMaximized] = useAtom(isNoteMaximizedAtom);
	const [canRedo, setCanRedo] = useState(false);
	const [canUndo, setCanUndo] = useState(false);

	function updateToolbar() {
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

	useNoteMarkdown(editor, folder, note, setCurrentSelectionFormat);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				() => {
					updateToolbar();
					return false;
				},
				LOW_PRIORITY,
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
				DROP_COMMAND,
				(e) => {
					console.log(e);
					return true;
				},
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
				CAN_REDO_COMMAND,
				(canRedo) => {
					setCanRedo(canRedo);
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor]);

	useFileDropEvent(editor, folder, note);

	const textFormats: { icon: ReactNode; format: TextFormatType }[] = [
		{
			icon: <TextBold />,
			format: "bold",
		},
		{
			icon: <TextItalic />,
			format: "italic",
		},
		{
			icon: <TextUnderline />,
			format: "underline",
		},
		{
			icon: <TextStrikethrough />,
			format: "strikethrough",
		},
	];
	const textFormattingButtons = textFormats.map(({ icon, format }) => (
		<motion.button
			{...getDefaultButtonVariants(disabled, 1.15, 0.95, 1.15)}
			className={cn(
				"rounded-md py-1 px-2 transition-colors duration-300 disabled:opacity-30",
				currentSelectionFormat.includes(format) && !disabled && "button-invert",
			)}
			disabled={disabled}
			type="button"
			onClick={() => {
				editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
				handleToolbarTextFormattingClick(
					currentSelectionFormat,
					setCurrentSelectionFormat,
					format,
				);
			}}
		>
			{icon}
		</motion.button>
	));

	const commandButtonData = [
		{
			block: null,
			icon: <Undo />,
			command: UNDO_COMMAND,
			customDisabled: !canUndo,
		},
		{
			block: null,
			icon: <Redo />,
			command: REDO_COMMAND,
			customDisabled: !canRedo,
		},
		{
			block: "ul",
			icon: <UnorderedList />,
			command: INSERT_UNORDERED_LIST_COMMAND,
		},
		{
			block: "ol",
			icon: <OrderedList />,
			command: INSERT_ORDERED_LIST_COMMAND,
		},
		{
			block: "check",
			icon: <ListCheckbox />,
			command: INSERT_CHECK_LIST_COMMAND,
		},
	];

	const commandButtons = commandButtonData.map(
		({ block, icon, command, customDisabled }) => (
			<motion.button
				{...getDefaultButtonVariants(
					customDisabled ?? disabled,
					1.15,
					0.95,
					1.15,
				)}
				className={cn(
					"rounded-md py-1 px-2 transition-colors duration-300 disabled:opacity-30",
					currentBlockType === block && !disabled && "button-invert",
				)}
				disabled={customDisabled ?? disabled}
				type="button"
				onClick={() => {
					// toggling the block off switches it to a paragraph
					if (block === currentBlockType) {
						editor.update(() => {
							const selection = $getSelection();
							if ($isRangeSelection(selection)) {
								$setBlocksType(selection, () => $createParagraphNode());
							}
						});
					} else {
						editor.dispatchCommand(command, undefined);
						if (block) setCurrentBlockType(block);
					}
				}}
			>
				{icon}
			</motion.button>
		),
	);

	return (
		<nav
			className={cn(
				"ml-[-4px] flex flex-wrap gap-1.5 border-b-[1px] border-b-zinc-200 py-2 pl-1 dark:border-b-zinc-700",
				isNoteMaximized && "!pl-3",
			)}
		>
			<span className="flex items-center gap-1.5">
				<motion.button
					onClick={() => setIsNoteMaximized((prev) => !prev)}
					{...getDefaultButtonVariants(disabled, 1.1, 0.95, 1.1)}
					className="pl-[.1rem] pr-0.5"
					type="button"
					animate={{ rotate: isNoteMaximized ? 180 : 0 }}
				>
					<SidebarRightCollapse height="1.4rem" width="1.4rem" />
				</motion.button>

				<Dropdown
					controlledValueIndex={blockTypesDropdownItems.findIndex(
						(v) => v.value === currentBlockType,
					)}
					dropdownItemsClassName="max-h-[calc(100vh-10rem)]"
					onChange={({ value }) =>
						changeSelectedBlocksType(editor, value, folder, note)
					}
					items={blockTypesDropdownItems}
					buttonClassName="w-[10rem]"
					disabled={disabled}
				/>
			</span>
			{commandButtons.slice(0, 2)}
			{textFormattingButtons}
			<motion.button
				{...getDefaultButtonVariants(disabled, 1.15, 0.95, 1.15)}
				className={cn(
					"rounded-md py-1 px-2 transition-colors duration-300 disabled:opacity-30",
				)}
				disabled={disabled}
				type="button"
				onClick={() => {
					editor.update(() => {
						const selection = $getSelection();
						if ($isRangeSelection(selection)) {
							const nativeSelection = window.getSelection()?.getRangeAt(0);
							const domRect = nativeSelection?.getBoundingClientRect();
							if (domRect) {
								const { top, left } = domRect;
								setFloatingLinkData({ isOpen: true, top, left });
							}
						}
					});
				}}
			>
				<Link />
			</motion.button>
			{commandButtons.slice(2)}
		</nav>
	);
}
