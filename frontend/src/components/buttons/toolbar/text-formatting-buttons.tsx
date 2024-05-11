import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND, type TextFormatType } from "lexical";
import type { Dispatch, SetStateAction } from "react";
import { MotionIconButton } from "..";
import { getDefaultButtonVariants } from "../../../animations";
import { cn } from "../../../utils/string-formatting";
import {
	handleToolbarTextFormattingClick,
	textFormats,
} from "../../editor/utils";

export function TextFormattingButtons({
	currentSelectionFormat,
	setCurrentSelectionFormat,
	isToolbarDisabled,
}: {
	currentSelectionFormat: TextFormatType[];
	setCurrentSelectionFormat: Dispatch<SetStateAction<TextFormatType[]>>;
	isToolbarDisabled: boolean;
}) {
	const [editor] = useLexicalComposerContext();

	const textFormattingButtons = textFormats.map(({ icon, format }) => (
		<MotionIconButton
			{...getDefaultButtonVariants(isToolbarDisabled)}
			className={cn(
				currentSelectionFormat.includes(format) &&
					!isToolbarDisabled &&
					"button-invert",
			)}
			disabled={isToolbarDisabled}
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

	return <>{textFormattingButtons}</>;
}
