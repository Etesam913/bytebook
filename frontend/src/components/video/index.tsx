import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef } from "react";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import type { ResizeWidth } from "../editor/nodes/image";
import { ResizeContainer } from "../resize-container";

export function Video({
	src,
	widthWrittenToNode,
	writeWidthToNode,
	title,
	nodeKey,
}: {
	src: string;
	widthWrittenToNode: ResizeWidth;
	writeWidthToNode: (width: ResizeWidth) => void;
	title: string;
	nodeKey: string;
}) {
	const [editor] = useLexicalComposerContext();
	const videoRef = useRef<HTMLVideoElement>(null);

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
		isResizing,
		isSelected,
		nodeKey,
		setSelected,
		clearSelection,
		videoRef,
	);

	return (
		<div className="w-full">
			<ResizeContainer
				isSelected={isSelected}
				isResizing={isResizing}
				setIsResizing={setIsResizing}
				element={videoRef.current}
				nodeKey={nodeKey}
				editor={editor}
				isExpanded={isExpanded}
				setIsExpanded={setIsExpanded}
				defaultWidth={widthWrittenToNode}
				writeWidthToNode={writeWidthToNode}
			>
				{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
				<video
					ref={videoRef}
					className="w-full h-auto bg-black"
					title={title}
					src={src}
					controls
					onClick={() => {
						clearSelection();
						setSelected(true);
					}}
				/>
			</ResizeContainer>
		</div>
	);
}
