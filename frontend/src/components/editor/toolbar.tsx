import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $setBlocksType } from "@lexical/selection";
import { type SetStateAction, useAtom, useAtomValue } from "jotai";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	REDO_COMMAND,
	type TextFormatType,
	UNDO_COMMAND,
} from "lexical";
import { type Dispatch, useEffect, useState } from "react";
import { WINDOW_ID } from "../../App";
import { getDefaultButtonVariants } from "../../animations";
import {
	attachmentsAtom,
	isNoteMaximizedAtom,
	isToolbarDisabled,
} from "../../atoms";
import { Link } from "../../icons/link";
import { Redo } from "../../icons/redo";
import { SidebarRightCollapse } from "../../icons/sidebar-right-collapse";
import { Undo } from "../../icons/undo";
import type { EditorBlockTypes, FloatingLinkData } from "../../types";
import { useIsStandalone, useWailsEvent } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";
import { MotionIconButton } from "../buttons";
import { Dropdown } from "../dropdown";
import { useNoteMarkdown, useToolbarEvents } from "./hooks";
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
	const [isNodeSelection, setIsNodeSelection] = useState(false);
	const [canRedo, setCanRedo] = useState(false);
	const [canUndo, setCanUndo] = useState(false);
	const attachments = useAtomValue(attachmentsAtom);

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
			oldWindowAppId !== WINDOW_ID
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
		setIsNodeSelection,
		folder,
	);

	// useFileDropEvent(editor, folder, note);

	const isStandalone = useIsStandalone();

	useEffect(() => {
		if (isStandalone) {
			setIsNoteMaximized(true);
		}
	}, [isStandalone]);

	const textFormattingButtons = textFormats.map(({ icon, format }) => (
		<MotionIconButton
			{...getDefaultButtonVariants(disabled)}
			className={cn(
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
		</MotionIconButton>
	));

	const commandButtonData = [
		{
			block: "undo",
			icon: <Undo />,
			command: UNDO_COMMAND,
			customDisabled: !canUndo || isNodeSelection,
		},
		{
			block: "redo",
			icon: <Redo />,
			command: REDO_COMMAND,
			customDisabled: !canRedo || isNodeSelection,
		},
		...listCommandData,
	];

	const commandButtons = commandButtonData.map(
		({ block, icon, command, customDisabled }) => (
			<MotionIconButton
				{...getDefaultButtonVariants(customDisabled ?? disabled)}
				key={`command-${block}`}
				className={cn(
					"bg-inherit",
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
			</MotionIconButton>
		),
	);

	return (
		<nav
			className={cn(
				"ml-[-4px] flex gap-1.5 border-b-[1px] border-b-zinc-200 p-2 dark:border-b-zinc-700 flex-wrap",
				isNoteMaximized && "!pl-[5.75rem]",
			)}
		>
			<span className="flex items-center gap-1.5">
				<MotionIconButton
					onClick={() => setIsNoteMaximized((prev) => !prev)}
					{...getDefaultButtonVariants(disabled)}
					type="button"
					animate={{ rotate: isNoteMaximized ? 180 : 0 }}
				>
					<SidebarRightCollapse
						title={isNoteMaximized ? "Minimize" : "Maximize"}
						height="1.4rem"
						width="1.4rem"
					/>
				</MotionIconButton>

				<Dropdown
					controlledValueIndex={blockTypesDropdownItems.findIndex(
						(v) => v.value === currentBlockType,
					)}
					dropdownItemsClassName="max-h-[calc(100vh-10rem)]"
					onChange={({ value }) =>
						changeSelectedBlocksType(editor, value, folder, note, attachments)
					}
					items={blockTypesDropdownItems}
					buttonClassName="w-[10rem]"
					disabled={disabled}
				/>
			</span>

			<span className="flex gap-1.5 flex-wrap">
				{commandButtons.slice(0, 2)}
				{textFormattingButtons}
				<MotionIconButton
					{...getDefaultButtonVariants(disabled)}
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
				</MotionIconButton>
				{commandButtons.slice(2)}
			</span>
		</nav>
	);
}
