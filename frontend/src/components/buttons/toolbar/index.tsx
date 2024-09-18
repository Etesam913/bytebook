import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { REDO_COMMAND, type TextFormatType, UNDO_COMMAND } from "lexical";
import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useState,
} from "react";
import { Redo } from "../../../icons/redo";
import { TextBold } from "../../../icons/text-bold";
import { TextItalic } from "../../../icons/text-italic";
import { TextStrikethrough } from "../../../icons/text-strikethrough";
import { TextUnderline } from "../../../icons/text-underline";
import { Undo } from "../../../icons/undo";
import { UnorderedList } from "../../../icons/unordered-list";
import type { EditorBlockTypes, FloatingDataType } from "../../../types";
import {
	handleToolbarBlockElementClick,
	handleToolbarTextFormattingClick,
} from "../../editor/utils/toolbar";

import { ListCheckbox } from "../../../icons/list-checkbox";
import { OrderedList } from "../../../icons/ordered-list";
import { cn } from "../../../utils/string-formatting";

type ButtonData = {
	icon: ReactNode;
	onClick: () => void;
	key: string;
	customDisabled?: boolean;
};

interface ToolbarButtonsProps {
	canUndo: boolean;
	canRedo: boolean;
	isNodeSelection: boolean;
	disabled: boolean;
	currentBlockType: EditorBlockTypes;
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
	currentSelectionFormat: TextFormatType[];
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>;
	setFloatingData: Dispatch<SetStateAction<FloatingDataType>>;
	shouldShowUndoRedo?: boolean;
	noteContainerRef: React.RefObject<HTMLDivElement>;
}

export function ToolbarButtons({
	canUndo,
	canRedo,
	isNodeSelection,
	disabled,
	currentBlockType,
	setCurrentBlockType,
	currentSelectionFormat,
	setCurrentSelectionFormat,
	setFloatingData,
	shouldShowUndoRedo,
	noteContainerRef,
}: ToolbarButtonsProps) {
	const [isHighlighted, setIsHighlighted] = useState(false);
	const [editor] = useLexicalComposerContext();

	const undoRedoData: ButtonData[] = [
		{
			icon: <Undo className="will-change-transform" />,
			onClick: () => {
				editor.dispatchCommand(UNDO_COMMAND, undefined);
			},
			key: "undo",
			customDisabled: canUndo || isNodeSelection,
		},
		{
			icon: <Redo className="will-change-transform" />,
			onClick: () => {
				editor.dispatchCommand(REDO_COMMAND, undefined);
			},
			key: "redo",
			customDisabled: canRedo || isNodeSelection,
		},
	];

	const buttonData: ButtonData[] = [
		{
			icon: <TextBold className="will-change-transform" />,
			onClick: () =>
				handleToolbarTextFormattingClick(
					editor,
					currentSelectionFormat,
					setCurrentSelectionFormat,
					"bold",
				),
			key: "bold",
		},
		{
			icon: <TextItalic className="will-change-transform" />,
			onClick: () =>
				handleToolbarTextFormattingClick(
					editor,
					currentSelectionFormat,
					setCurrentSelectionFormat,
					"italic",
				),
			key: "italic",
		},
		{
			icon: <TextUnderline className="will-change-transform" />,
			onClick: () =>
				handleToolbarTextFormattingClick(
					editor,
					currentSelectionFormat,
					setCurrentSelectionFormat,
					"underline",
				),
			key: "underline",
		},
		{
			icon: <TextStrikethrough className="will-change-transform" />,
			onClick: () =>
				handleToolbarTextFormattingClick(
					editor,
					currentSelectionFormat,
					setCurrentSelectionFormat,
					"strikethrough",
				),
			key: "strikethrough",
		},
		{
			icon: <UnorderedList className="will-change-transform" />,
			onClick: () =>
				handleToolbarBlockElementClick(
					editor,
					"ul",
					currentBlockType,
					setCurrentBlockType,
				),
			key: "ul",
		},
		{
			icon: <OrderedList className="will-change-transform" />,
			onClick: () =>
				handleToolbarBlockElementClick(
					editor,
					"ol",
					currentBlockType,
					setCurrentBlockType,
				),
			key: "ol",
		},
		{
			icon: <ListCheckbox className="will-change-transform" />,
			onClick: () =>
				handleToolbarBlockElementClick(
					editor,
					"check",
					currentBlockType,
					setCurrentBlockType,
				),
			key: "check",
		},
	];

	function getButtonsData() {
		if (shouldShowUndoRedo) {
			return [...undoRedoData, ...buttonData];
		}
		return buttonData;
	}

	const toolbarButtons = getButtonsData().map(
		({ icon, onClick, key, customDisabled }) => {
			return (
				<button
					key={key}
					onClick={onClick}
					type="button"
					disabled={disabled || customDisabled}
					className={cn(
						"p-1.5 rounded-md transition-colors",
						(key === currentBlockType ||
							currentSelectionFormat.includes(key)) &&
							!disabled &&
							!customDisabled &&
							"button-invert",
					)}
				>
					{icon}
				</button>
			);
		},
	);

	return (
		<span className="flex gap-1.5 overflow-hidden relative">
			{toolbarButtons}
		</span>
	);
}
