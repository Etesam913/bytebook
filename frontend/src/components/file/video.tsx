import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useRef, useState } from "react";
import { useShowWhenInViewport } from "../../hooks/observers";
import type { ResizeWidth } from "../../types";
import { useResizeCommands, useResizeState } from "../../utils/hooks";
import { cn } from "../../utils/string-formatting";
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
	const [isInViewport, setIsInViewport] = useState(true);
	const loaderRef = useRef<HTMLDivElement>(null); // Reference for loader
	const [isLoading, setIsLoading] = useState(true);

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

	useShowWhenInViewport(loaderRef, setIsInViewport, isExpanded);

	return (
		<div
			className={cn(
				"mr-2 inline-block",
				(isLoading || isInViewport) && "block",
			)}
		>
			{isInViewport ? (
				<div
					ref={loaderRef}
					className="my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none"
				/>
			) : (
				<>
					{isLoading && (
						<div className="my-3 w-full h-[36rem] bg-gray-200 dark:bg-zinc-600 animate-pulse pointer-events-none" />
					)}
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
						{(isExpanded || !isExpanded) && (
							<video
								ref={videoRef}
								style={{ display: isLoading ? "none" : "block" }}
								className="w-full h-auto bg-black my-auto scroll-m-10"
								title={title}
								src={src}
								controls
								onLoadedData={() => setIsLoading(false)}
								preload="auto"
								crossOrigin="anonymous"
								data-nodeKey={nodeKey}
								data-interactable="true"
							/>
						)}
					</ResizeContainer>
				</>
			)}
		</div>
	);
}
