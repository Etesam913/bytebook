import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef } from "react";

import type { ResizeWidth } from "../../types";
import { useResizeCommands, useResizeState } from "../../utils/hooks";

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
		isSelected,
		isResizing,
		nodeKey,
		setSelected,
		clearSelection,
		videoRef,
	);

	return (
		<>
			<div className="w-fit inline-block">
				<ResizeContainer
					resizeState={{
						isResizing,
						setIsResizing,
						isSelected,
						isExpanded,
						setIsExpanded,
					}}
					element={videoRef.current}
					nodeKey={nodeKey}
					defaultWidth={widthWrittenToNode}
					writeWidthToNode={writeWidthToNode}
					elementType="default"
				>
					<video
						ref={videoRef}
						className="w-full h-auto bg-black"
						title={title}
						src={`${src}#t=0.001`}
						controls
						preload="metadata"
						crossOrigin="anonymous"
					/>
				</ResizeContainer>
			</div>
		</>
	);
}
