import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { CLICK_COMMAND, COMMAND_PRIORITY_HIGH } from "lexical";
import { useEffect, useRef } from "react";
import { TagIcon } from "../../icons/tag";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";

export function Tag({ tag, nodeKey }: { tag: string; nodeKey: string }) {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const tagRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					e.stopPropagation();
					return onClickDecoratorNodeCommand(
						e,
						tagRef.current,
						setSelected,
						clearSelection,
					);
				},
				COMMAND_PRIORITY_HIGH,
			),
		);
	}, []);

	return (
		<div
			ref={tagRef}
			className={cn(
				"text-sm bg-zinc-700 w-fit py-0.5 px-2.5 cursor-pointer rounded-full inline-flex items-center gap-1.5 mx-1 translate-y-0.5",
				isSelected && "outline outline-2 outline-blue-500",
			)}
		>
			<TagIcon height={14} width={14} />
			<span>{tag}</span>
		</div>
	);
}
