import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $setBlocksType } from "@lexical/selection";
import { motion } from "framer-motion";
import { useAtom, SetStateAction } from "jotai";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	REDO_COMMAND,
	type TextFormatType,
	UNDO_COMMAND,
} from "lexical";
import { type Dispatch, useState } from "react";
import { APP_ID } from "../../App";
import { isNoteMaximizedAtom, isToolbarDisabled } from "../../atoms";
import { Link } from "../../icons/link";
import { Redo } from "../../icons/redo";
import { SidebarRightCollapse } from "../../icons/sidebar-right-collapse";
import { Undo } from "../../icons/undo";
import type { EditorBlockTypes, FloatingLinkData } from "../../types";
import { useIsStandalone, useWailsEvent } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";
import { getDefaultButtonVariants } from "../../variants";
import { Dropdown } from "../dropdown";
import { useFileDropEvent, useNoteMarkdown, useToolbarEvents } from "./hooks";
import { CUSTOM_TRANSFORMERS } from "./transformers";
import {
	$convertFromMarkdownStringCorrect,
	blockTypesDropdownItems,
	changeSelectedBlocksType,
	handleToolbarTextFormattingClick,
	listCommandData,
	textFormats,
} from "./utils";

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
	useNoteMarkdown(editor, folder, note, setCurrentSelectionFormat);

	useWailsEvent("note:changed", (e) => {
		const data = e.data as {
			folder: string;
			note: string;
			markdown: string;
			oldWindowAppId: string;
		};
		const {
			folder: folderName,
			note: noteName,
			markdown,
			oldWindowAppId,
		} = data;

		if (
			folderName === folder &&
			noteName === note &&
			oldWindowAppId !== APP_ID
		) {
			editor.update(
				() => {
					$convertFromMarkdownStringCorrect(markdown, CUSTOM_TRANSFORMERS);
				},
				{ tag: "note:changed-from-other-window" },
			);
		}
	});

	useToolbarEvents(
		editor,
		setDisabled,
		setCurrentSelectionFormat,
		setCurrentBlockType,
		setCanUndo,
		setCanRedo,
	);

	useFileDropEvent(editor, folder, note);
	const isStandalone = useIsStandalone();
	const textFormattingButtons = textFormats.map(({ icon, format }) => (
		<motion.button
			{...getDefaultButtonVariants(disabled, 1.15, 0.95, 1.15)}
			className={cn(
				"rounded-md py-1 px-2 transition-colors duration-300 disabled:opacity-30",
				currentSelectionFormat.includes(format) && !disabled && "button-invert",
			)}
			disabled={disabled}
			type="button"
			key={`text-format-${format}`}
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
			block: "undo",
			icon: <Undo />,
			command: UNDO_COMMAND,
			customDisabled: !canUndo,
		},
		{
			block: "redo",
			icon: <Redo />,
			command: REDO_COMMAND,
			customDisabled: !canRedo,
		},
		...listCommandData,
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
				key={`command-${block}`}
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
				(isNoteMaximized || isStandalone) && "!pl-[5.75rem]",
			)}
		>
			<span className="flex items-center gap-1.5">
				{!isStandalone && (
					<motion.button
						onClick={() => setIsNoteMaximized((prev) => !prev)}
						{...getDefaultButtonVariants(disabled, 1.1, 0.95, 1.1)}
						className="pl-[.1rem] pr-0.5"
						type="button"
						animate={{ rotate: isNoteMaximized ? 180 : 0 }}
					>
						<SidebarRightCollapse height="1.4rem" width="1.4rem" />
					</motion.button>
				)}

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
