import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { CLICK_COMMAND, COMMAND_PRIORITY_NORMAL } from "lexical";
import { useEffect, useRef } from "react";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { KatexRenderer } from "./katex-renderer";

export function InlineEquation({
	nodeKey,
	equation,
}: { nodeKey: string; equation: string }) {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const inlineEquationRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					e.stopPropagation();
					return onClickDecoratorNodeCommand(
						e,
						inlineEquationRef.current,
						setSelected,
						clearSelection,
					);
				},
				COMMAND_PRIORITY_NORMAL,
			),
		);
	}, []);

	return (
		<span
			ref={inlineEquationRef}
			className={
				isSelected
					? "bg-blue-500 bg-opacity-35 dark:bg-blue-400 dark:bg-opacity-55"
					: ""
			}
		>
			<KatexRenderer equation={equation} />
		</span>
	);
}
