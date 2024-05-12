import type { TextFormatType } from "lexical";
import type { Dispatch, SetStateAction } from "react";
import type { EditorBlockTypes, FloatingDataType } from "../../../types";
import { CommandButtons } from "./command-buttons";
import { TextFormattingButtons } from "./text-formatting-buttons";
import { ToggleLinkButton } from "./toggle-link";

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
	return (
		<span className="flex gap-1.5 flex-wrap">
			{shouldShowUndoRedo && (
				<>
					{
						CommandButtons({
							canUndo,
							canRedo,
							isNodeSelection,
							isToolbarDisabled: disabled,
							currentBlockType,
							setCurrentBlockType,
						})["undo-redo-commands"]
					}
				</>
			)}

			<TextFormattingButtons
				currentSelectionFormat={currentSelectionFormat}
				setCurrentSelectionFormat={setCurrentSelectionFormat}
				isToolbarDisabled={disabled}
			/>
			<ToggleLinkButton
				disabled={disabled}
				setFloatingData={setFloatingData}
				noteContainerRef={noteContainerRef}
			/>
			{
				CommandButtons({
					canUndo,
					canRedo,
					isNodeSelection,
					isToolbarDisabled: disabled,
					currentBlockType,
					setCurrentBlockType,
				})["list-commands"]
			}
		</span>
	);
}
