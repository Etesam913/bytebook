import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef } from "react";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import { ResizeContainer } from "../resize-container";

export function Video({
	src,
	width,
	height,
	title,
	nodeKey,
}: {
	src: string;
	width: number | "inherit";
	height: number | "inherit";
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
			>
				{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
				<video
					ref={videoRef}
					className="w-full h-auto bg-black"
					title={title}
					src={`${src}#t=0.1`}
					controls
					preload="metadata"
				/>
			</ResizeContainer>
		</div>
	);
}
