import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { CLICK_COMMAND, COMMAND_PRIORITY_NORMAL } from "lexical";
import { useEffect, useRef } from "react";
import { Paperclip } from "../../icons/paperclip-2";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";

export function UnknownAttachment({
	nodeKey,
	src,
}: { nodeKey: string; src: string }) {
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [editor] = useLexicalComposerContext();
	const sourceSegments = src.split("/");
	const urlToShow = sourceSegments.slice(-3).join("/");
	const elementRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					return onClickDecoratorNodeCommand(
						e,
						elementRef.current,
						false,
						setSelected,
						clearSelection,
					);
				},
				COMMAND_PRIORITY_NORMAL,
			),
		);
	}, []);

	return (
		<button
			type="button"
			ref={elementRef}
			className={cn(
				"px-2.5 py-1 bg-zinc-100 dark:bg-zinc-700 w-fit rounded-md  text-left",
				isSelected && "outline outline-2 outline-blue-500",
			)}
		>
			<div className="flex items-center gap-1.5 pointer-events-none">
				<Paperclip /> Unknown Attachment
			</div>
			<div className="text-xs mt-1 text-zinc-300 pointer-events-none">
				{urlToShow}
			</div>
		</button>
	);
}
