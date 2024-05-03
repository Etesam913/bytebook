import { Excalidraw } from "@excalidraw/excalidraw";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef } from "react";
import type { ResizeWidth } from "../../types";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import { ResizeContainer } from "../resize-container";

export function ExcalidrawComponent({
	nodeKey,
	widthWrittenToNode,
	writeWidthToNode,
}: {
	nodeKey: string;
	widthWrittenToNode: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const excalidrawRef = useRef<HTMLDivElement>(null);

	const {
		isResizing,
		setIsResizing,
		isSelected,
		setSelected,
		clearSelection,
		isExpanded,
		setIsExpanded,
	} = useResizeState(nodeKey);

	useResizeCommands(
		editor,
		isExpanded,
		setIsExpanded,
		isSelected,
		isResizing,
		nodeKey,
		setSelected,
		clearSelection,
		excalidrawRef,
		{ enter: true },
	);

	return (
		<div className="w-full" ref={excalidrawRef}>
			<ResizeContainer
				resizeState={{
					isResizing,
					setIsResizing,
					isSelected,
					isExpanded,
					setIsExpanded,
				}}
				shouldHeightMatchWidth
				element={excalidrawRef.current}
				defaultWidth={widthWrittenToNode}
				writeWidthToNode={writeWidthToNode}
				nodeKey={nodeKey}
				elementType="excalidraw"
			>
				<Excalidraw />
			</ResizeContainer>
		</div>
	);
}
