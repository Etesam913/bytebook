import { Excalidraw, MainMenu, THEME } from "@excalidraw/excalidraw";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import { useAtomValue } from "jotai";
import { CLICK_COMMAND, COMMAND_PRIORITY_NORMAL } from "lexical";
import { useEffect, useRef } from "react";
import { darkModeAtom } from "../../atoms";
import { onClickDecoratorNodeCommand } from "../../utils/commands";
import { cn } from "../../utils/string-formatting";
import { useFocusOnSelect } from "./hooks";
export function ExcalidrawComponent({
	nodeKey,
}: {
	nodeKey: string;
}) {
	const [editor] = useLexicalComposerContext();
	const excalidrawRef = useRef<HTMLDivElement>(null);
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const isDarkModeOn = useAtomValue(darkModeAtom);
	useFocusOnSelect(isSelected, excalidrawRef.current);

	useEffect(() => {
		return mergeRegister(
			editor.registerCommand<MouseEvent>(
				CLICK_COMMAND,
				(e) => {
					// if (!isExpanded) {
					e.stopPropagation();
					return onClickDecoratorNodeCommand(
						e,
						excalidrawRef.current,
						setSelected,
						clearSelection,
					);
					// }

					// e.preventDefault();
					// return true;
				},
				COMMAND_PRIORITY_NORMAL,
			),
		);
	}, []);

	return (
		<div
			className={cn(
				"w-full border-[4px] border-transparent transition-colors",
				isSelected && "border-blue-400 dark:border-blue-500",
			)}
			ref={excalidrawRef}
			onMouseDown={(e) => {
				e.stopPropagation();
			}}
			onKeyDown={(e) => e.stopPropagation()}
		>
			<Excalidraw theme={isDarkModeOn ? THEME.DARK : THEME.LIGHT}>
				<MainMenu />
			</Excalidraw>
		</div>
	);
}
