import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState } from "react";
import { useShowWhenInViewport } from "../../hooks/observers";
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
	const [isLoading, setIsLoading] = useState(true);
	const loaderRef = useRef<HTMLDivElement>(null); // Reference for loader

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
		nodeKey,
		clearSelection,
		videoRef,
	);

	useShowWhenInViewport(loaderRef, setIsLoading, isExpanded);

	return (
		<div
			className={"w-full inline-block"}
			onClick={(e) => {
				clearSelection();
				setSelected(true);
				e.stopPropagation();
			}}
		>
			{isLoading ? (
				<div
					ref={loaderRef}
					className="my-3 w-full h-[36rem] bg-gray-300 animate-pulse pointer-events-none"
				/>
			) : (
				<ResizeContainer
					resizeState={{
						isResizing,
						setIsResizing,
						isSelected,
						setSelected,
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
			)}
		</div>
	);
}
