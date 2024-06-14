import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $setBlocksType } from "@lexical/selection";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	REDO_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import { type Dispatch, type SetStateAction, useMemo } from "react";
import { MotionIconButton } from "..";
import { getDefaultButtonVariants } from "../../../animations";
import { Redo } from "../../../icons/redo";
import { Undo } from "../../../icons/undo";
import type { EditorBlockTypes } from "../../../types";
import { cn } from "../../../utils/string-formatting";
import { listCommandData } from "../../editor/utils/toolbar";

export function CommandButtons({
	canUndo,
	canRedo,
	isNodeSelection,
	isToolbarDisabled,
	currentBlockType,
	setCurrentBlockType,
}: {
	canUndo: boolean;
	canRedo: boolean;
	isNodeSelection: boolean;
	isToolbarDisabled: boolean;
	currentBlockType: EditorBlockTypes;
	setCurrentBlockType: Dispatch<SetStateAction<EditorBlockTypes>>;
}) {
	const [editor] = useLexicalComposerContext();
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

	const commandButtons = useMemo(
		() =>
			commandButtonData.map(({ block, icon, command, customDisabled }) => (
				<MotionIconButton
					{...getDefaultButtonVariants(customDisabled ?? isToolbarDisabled)}
					key={`command-${block}`}
					className={cn(
						"bg-inherit",
						currentBlockType === block && !isToolbarDisabled && "button-invert",
					)}
					disabled={customDisabled ?? isToolbarDisabled}
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
			)),
		[
			commandButtonData,
			currentBlockType,
			editor,
			isToolbarDisabled,
			setCurrentBlockType,
		],
	);

	return {
		"undo-redo-commands": commandButtons.slice(0, 2),
		"list-commands": commandButtons.slice(2),
	};
}
